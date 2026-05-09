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
const FormItemContext = React.createContext<{ id: string }>({ id: '' });

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
  const itemContext = React.useContext(FormItemContext);
  if (!fieldContext.name) {
    throw new Error('useFormField must be used within <FormField>');
  }
  const { getFieldState, formState } = useFormContext();
  return {
    name: fieldContext.name,
    id: itemContext.id,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...getFieldState(fieldContext.name, formState),
  };
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = 'FormItem';

export function FormLabel({ className, htmlFor, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      htmlFor={htmlFor ?? formItemId}
      className={cn(error && 'text-destructive', className)}
      {...props}
    />
  );
}

export function FormControl({ children }: { children: React.ReactElement }) {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();
  const childProps = children.props as Record<string, unknown>;
  return React.cloneElement(children, {
    // Only inject id if the child doesn't already have one
    ...(childProps.id ? {} : { id: formItemId }),
    'aria-describedby': `${formDescriptionId} ${formMessageId}`,
  } as React.HTMLAttributes<HTMLElement>);
}

export function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message) : children;
  if (!body) return null;
  return (
    <p id={formMessageId} className={cn('text-xs text-destructive', className)} {...props}>
      {body}
    </p>
  );
}
