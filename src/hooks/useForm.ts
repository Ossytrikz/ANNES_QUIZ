import { useState, useCallback, ChangeEvent } from 'react';
import { z, ZodTypeAny } from 'zod';

type FormErrors<T> = Partial<Record<keyof T, string>>;

export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  schema?: z.ZodObject<{ [K in keyof T]: ZodTypeAny }>,
  onSubmit?: (values: T) => void | Promise<void>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback(() => {
    if (!schema) return true;
    
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = error.errors.reduce<FormErrors<T>>((acc, curr) => {
          const key = curr.path[0] as keyof T;
          if (key) {
            acc[key] = curr.message;
          }
          return acc;
        }, {});
        setErrors(newErrors);
      }
      return false;
    }
  }, [schema, values]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      
      setValues(prev => ({
        ...prev,
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : value
      }));

      // Clear error for the field being edited
      if (errors[name as keyof T]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    },
    [errors]
  );

  const setFieldValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit?.(values);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, validate, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    resetForm,
    setValues,
    setErrors,
  };
};

export default useForm;
