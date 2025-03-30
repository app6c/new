import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface ToggleableTextFieldProps {
  title: string;
  radioName: string;
  radioBooleanField: string;
  textName: string;
  textField: string;
  form: UseFormReturn<any>;
  yesLabel?: string;
  noLabel?: string;
  textLabel?: string;
  textRows?: number;
  required?: boolean;
}

const ToggleableTextField: React.FC<ToggleableTextFieldProps> = ({
  title,
  radioName,
  radioBooleanField,
  textName,
  textField,
  form,
  yesLabel = 'Sim',
  noLabel = 'Não',
  textLabel = 'Se sim, descreva:',
  textRows = 3,
  required = true,
}) => {
  const showTextField = form.watch(radioBooleanField);

  return (
    <div className="mb-6">
      <p className="font-medium text-slate-700 mb-3">{title}{required && '*'}</p>
      
      <FormField
        control={form.control}
        name={radioBooleanField}
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormControl>
              <RadioGroup
                onValueChange={(value) => field.onChange(value === 'yes')}
                defaultValue={field.value ? 'yes' : 'no'}
                className="space-y-2"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id={`${radioName}-yes`} />
                  <Label htmlFor={`${radioName}-yes`} className="ml-2 cursor-pointer">
                    {yesLabel}
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id={`${radioName}-no`} />
                  <Label htmlFor={`${radioName}-no`} className="ml-2 cursor-pointer">
                    {noLabel}
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {showTextField && (
        <FormField
          control={form.control}
          name={textField}
          render={({ field }) => (
            <FormItem className="mt-3">
              <FormLabel className="text-sm text-slate-700">{textLabel}</FormLabel>
              <FormControl>
                <Textarea 
                  rows={textRows}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default ToggleableTextField;
