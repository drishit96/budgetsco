import { z } from "zod";
import { formatErrors } from "~/utils/error.utils";

const loginInput = {
  emailId: z.string().email("E-mail Id cannot be empty"),
  password: z.string().min(1, "Password cannot be empty"),
};

const registerInput = {
  emailId: z.string().email("Please enter a valid e-mail address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
};

export const LoginInputSchema = z.object({
  ...loginInput,
});

export const RegisterInputSchema = z
  .object(registerInput)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export function parseLoginInput(loginInput: unknown) {
  const output = LoginInputSchema.safeParse(loginInput);
  if (output.success) {
    return {
      errors: null,
      loginData: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, loginData: null };
  }
}

export function parseRegisterInput(registerInput: unknown) {
  const output = RegisterInputSchema.safeParse(registerInput);
  if (output.success) {
    return {
      errors: null,
      registerData: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    console.log(JSON.stringify(errors));
    return { errors, registerData: null };
  }
}
