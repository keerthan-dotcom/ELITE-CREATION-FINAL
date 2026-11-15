-- Fix for column mismatch (Frontend expects 'grade', DB has 'class_grade')
ALTER TABLE public.orders RENAME COLUMN class_grade TO grade;
