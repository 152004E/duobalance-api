import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  RESEND_API_KEY: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().default('onboarding@resend.dev'),
  FRONTEND_URL: Joi.string().default('http://localhost:8081'),
});
