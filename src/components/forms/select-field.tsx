'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option { value: string; label: string }
interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  options: Option[];
  placeholder?: string;
}

export function SelectField<TForm extends FieldValues>({ control, name, label, options, placeholder }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={(field.value as string | undefined) ?? ''} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger><SelectValue placeholder={placeholder ?? '선택'} /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
