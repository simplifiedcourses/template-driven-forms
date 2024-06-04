import { Directive, inject, Input, OnDestroy, Output } from '@angular/core';
import {
    AsyncValidatorFn,
    NgForm,
    PristineChangeEvent,
    StatusChangeEvent,
    ValidationErrors,
    ValueChangeEvent
} from '@angular/forms';
import {
    BehaviorSubject,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    take,
    takeUntil,
    tap,
    zip
} from 'rxjs';
import { StaticSuite } from 'vest';
import { cloneDeep, set } from 'lodash';
import { mergeValuesAndRawValues } from './utils';

@Directive({
    selector: 'form',
    standalone: true,
})
export class FormDirective<T> implements OnDestroy {
    public readonly ngForm = inject(NgForm, { self: true });
    @Input() public formValue: T | null = null;
    @Input() public suite: StaticSuite<string, string, (model: T, field: string) => void> | null = null;

    private readonly statusChanges$ = this.ngForm.form.events.pipe(
        filter(v => v instanceof StatusChangeEvent),
        map(v => (v as StatusChangeEvent).status),
        distinctUntilChanged()
    );

    private readonly idle$ = this.statusChanges$.pipe(
        filter(v => v !== 'PENDING'),
        distinctUntilChanged()
    );

    private readonly valueChanges$ = this.ngForm.form.events.pipe(
        filter(v => v instanceof ValueChangeEvent),
        map(v => (v as ValueChangeEvent<any>).value),
        map(() => mergeValuesAndRawValues<T>(this.ngForm.form)),
    );

    private readonly dirtyChanges$ = this.ngForm.form.events.pipe(
        filter(v => v instanceof PristineChangeEvent),
        map(v => !(v as PristineChangeEvent).pristine),
        distinctUntilChanged()
    );

    private readonly validChanges$ = this.statusChanges$.pipe(
        filter(e => e === 'VALID' || e === 'INVALID'),
        map(v => v === 'VALID'),
        distinctUntilChanged()
    );

    /**
     * Triggered as soon as the form value changes
     */
    @Output() public readonly formValueChange = this.valueChanges$;

    /**
     * Triggered as soon as the form becomes dirty
     */
    @Output() public readonly dirtyChange = this.dirtyChanges$;

    /**
     * TriggerdWhen the form becomes valid
     */
    @Output() public readonly validChange = this.validChanges$;

    /**
     * Used to debounce formValues to make sure vest isn't triggered all the time
     */
    private readonly formValueCache: {
        [field: string]: Partial<{
            sub$$: ReplaySubject<unknown>;
            debounced: Observable<any>;
        }>;
    } = {};

    /**
     * Contains the ValidationConfig in a BehaviorSubject. We use a subject because the ValidationConfig has to be
     * dynamic and reactive
     * @private
     */
    private readonly validationConfig$$ = new BehaviorSubject<{ [key: string]: string[] } | null>(null);
    private readonly destroy$$ = new Subject<void>();

    public constructor() {
        this.validationConfig$$
            .pipe(
                filter((conf) => !!conf),
                switchMap((conf) => {
                    if (!conf) {
                        return of(null);
                    }
                    const streams = Object.keys(conf).map((key) => {
                        return this.formValueChange?.pipe(
                            // wait until the form is idle
                            switchMap((v) => this.idle$),
                            map(() => this.ngForm?.form.get(key)?.value),
                            distinctUntilChanged(), // only trigger dependants when the value actually changed
                            takeUntil(this.destroy$$),
                            tap((v) => {
                                conf[key]?.forEach((path: string) => {
                                    this.ngForm?.form.get(path)?.updateValueAndValidity({
                                        onlySelf: true,
                                        emitEvent: true
                                    });
                                });
                            }),
                        );
                    });
                    return zip(streams);
                }),
            )
            .subscribe();

        /**
         * Mark all the fields as touched when the form is submitted
         */
        this.ngForm.ngSubmit.subscribe(() => {
            this.ngForm.form.markAllAsTouched();
        });
    }

    /**
     * Updates the validation config which is a dynamic object that will be used to
     * trigger validations on depending fields
     * @param v
     */
    @Input()
    public set validationConfig(v: { [key: string]: string[] }) {
        this.validationConfig$$.next(v);
    }

    public ngOnDestroy(): void {
        this.destroy$$.next();
    }

    /**
     * This will feed the formValueCache, debounce it till the next tick
     * and create an asynchronous validator that runs a vest suite
     * @param field
     * @param model
     * @param suite
     * @returns an asynchronous vlaidator function
     */
    public createAsyncValidator(
        field: string,
        model: T,
        suite:
            | StaticSuite<string, string, (model: T, field: string) => void>
    ): AsyncValidatorFn {
        return (value: any) => {
            const mod = cloneDeep(model);
            set(mod as object, field, value); // Update the property with path
            if (!this.formValueCache[field]) {
                this.formValueCache[field] = {
                    sub$$: new ReplaySubject(1), // Keep track of the last model
                };
                this.formValueCache[field].debounced = this.formValueCache[field].sub$$!.pipe(debounceTime(0));
            }
            // Next the latest model in the cache for a certain field
            this.formValueCache[field].sub$$!.next(mod);

            return this.formValueCache[field].debounced!.pipe(
                // When debounced, take the latest value and perform the asynchronous vest validation
                take(1),
                switchMap(() => {
                    return new Observable((observer) => {
                        suite(mod, field).done((result) => {
                            const errors = result.getErrors()[field];
                            observer.next((errors ? { error: errors[0], errors } : null));
                            observer.complete();
                        });
                    }) as Observable<ValidationErrors | null>;
                }),
                takeUntil(this.destroy$$),
            );
        };
    }
}