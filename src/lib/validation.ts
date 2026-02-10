import { z } from 'zod';

// Phone number validation - accepts local US format or international
export const phoneSchema = z.string()
  .transform((val) => {
    // Strip all non-digit characters
    const digits = val.replace(/\D/g, '');
    // If 10 digits, assume US and prepend +1
    if (digits.length === 10) return `+1${digits}`;
    // If 11 digits starting with 1, prepend +
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // If already has +, keep as is
    if (val.startsWith('+')) return val.replace(/[^\d+]/g, '');
    // Otherwise return cleaned digits with +
    return digits.length > 0 ? `+${digits}` : val;
  })
  .pipe(
    z.string()
      .regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number (e.g., 555-123-4567 or +12025551234)')
      .min(8, 'Phone number is too short')
      .max(16, 'Phone number is too long')
  );

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email is too long')
  .trim();

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

// Name validation
export const nameSchema = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name is too long');

// Message/content validation
export const messageSchema = z.string()
  .trim()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message is too long');

// Lead creation schema
export const leadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  source: z.string().trim().min(1).max(100),
  status: z.string().optional(),
  value: z.string().max(50).optional(),
  property_address: z.string().max(500).optional(),
  property_type: z.string().max(100).optional(),
  budget: z.string().max(100).optional(),
  timeframe: z.string().max(100).optional(),
});

// Auth schema - all fields required for signup
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
});

// Profile completion schema - all fields required
export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// SMS schema for edge function
export const smsSchema = z.object({
  to: phoneSchema,
  message: messageSchema,
  leadId: z.string().uuid().optional(),
});

// Call schema for edge function
export const callSchema = z.object({
  to: phoneSchema,
  leadName: z.string().max(100).optional(),
});
