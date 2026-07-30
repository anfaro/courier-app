import { z } from "zod";

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  email: z.string().email("Invalid email").max(256),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  phoneNumber: z.string().max(50).optional().default(""),
  address: z.string().min(1, "Address is required"),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  housePictureUrl: z.string().optional().nullable(),
  housePictures: z.array(z.string()).optional().nullable(),
  landmark: z.string().optional().nullable(),
  accessInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clusterIds: z.array(z.string()).optional().nullable(),
});

export const sessionCreateSchema = z.object({
  date: z.string().optional(),
});

export const sessionUpdateSchema = z.object({
  finalized: z.boolean().optional(),
  date: z.string().optional(),
  totalPackages: z.string().optional(),
  deliveredPackages: z.string().optional(),
});

export const incomingCreateSchema = z.object({
  packages: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  customerAssignments: z
    .array(
      z.object({
        customerId: z.string().min(1),
        packages: z.union([z.string(), z.number()]).transform((v) => String(v)),
      })
    )
    .optional()
    .default([]),
});

export const deliveryStatusSchema = z.object({
  status: z.enum(["pending", "delivered", "returned", "rescheduled"]),
  splitCount: z.number().int().positive().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export const clusterSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  notes: z.string().optional().nullable(),
});

export const settingsSchema = z.object({
  newName: z.string().min(1).max(256).optional(),
  rate: z.number().min(0).optional(),
  targetSystem: z.boolean().optional(),
  getGeocode: z.boolean().optional(),
});
