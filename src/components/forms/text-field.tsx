'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export function TextField<TForm extends FieldValues>({ control, name, label, placeholder, required }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}</FormLabel>
          <FormControl>
            <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
