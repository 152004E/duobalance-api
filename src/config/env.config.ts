import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  MAIL_PROVIDER: Joi.string().valid('resend', 'brevo').default('resend'),
  RESEND_API_KEY: Joi.string().when('MAIL_PROVIDER', {
    is: 'resend',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  BREVO_API_KEY: Joi.string().when('MAIL_PROVIDER', {
    is: 'brevo',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  MAIL_FROM: Joi.string().default('onboarding@resend.dev'),
  FRONTEND_URL: Joi.string().default('http://localhost:8081'),
  CORS_ORIGINS: Joi.string().default('http://localhost:8081,http://localhost:8082'),
});
