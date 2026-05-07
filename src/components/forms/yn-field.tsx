'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
}

export function YnField<TForm extends FieldValues>({ control, name, label }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center gap-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value === 'Y'}
              onCheckedChange={(c) => field.onChange(c ? 'Y' : 'N')}
            />
          </FormControl>
          <FormLabel className="cursor-pointer">{label}</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
