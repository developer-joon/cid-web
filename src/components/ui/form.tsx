'use client';
import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  if (!fieldContext.name) {
    throw new Error('useFormField must be used within <FormField>');
  }
  const { getFieldState, formState } = useFormContext();
  return { name: fieldContext.name, ...getFieldState(fieldContext.name, formState) };
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
  ),
);
FormItem.displayName = 'FormItem';

export function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error } = useFormField();
  return (
    <Label className={cn(error && 'text-destructive', className)} {...props} />
  );
}

export function FormControl(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { error } = useFormField();
  const body = error ? String(error.message) : children;
  if (!body) return null;
  return (
    <p className={cn('text-xs text-destructive', className)} {...props}>
      {body}
    </p>
  );
}
