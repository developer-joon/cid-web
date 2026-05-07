'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  unit?: string;
}

export function NumberField<TForm extends FieldValues>({ control, name, label, unit }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{unit ? <span className="ml-1 text-xs text-muted-foreground">({unit})</span> : null}</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value === undefined || field.value === null ? '' : String(field.value)}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === '' ? undefined : Number(v));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
