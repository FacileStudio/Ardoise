import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.NullTypes.DbNull;
  if (v === 'JsonNull') return Prisma.NullTypes.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.any() }),
    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// DECIMAL
//------------------------------------------------------

export const DecimalJsLikeSchema: z.ZodType<Prisma.DecimalJsLike> = z.object({
  d: z.array(z.number()),
  e: z.number(),
  s: z.number(),
  toFixed: z.any(),
})

export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:\.[01]+)?(?:[pP][-+]?\d+)?|0[oO][0-7]+(?:\.[0-7]+)?(?:[pP][-+]?\d+)?|0[xX][\da-fA-F]+(?:\.[\da-fA-F]+)?(?:[pP][-+]?\d+)?|(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?))$/;

export const isValidDecimalInput =
  (v?: null | string | number | Prisma.DecimalJsLike): v is string | number | Prisma.DecimalJsLike => {
    if (v === undefined || v === null) return false;
    return (
      (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) ||
      (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) ||
      typeof v === 'number'
    )
  };

/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const AccountScalarFieldEnumSchema = z.enum(['id','userId','accountId','providerId','accessToken','refreshToken','accessTokenExpiresAt','refreshTokenExpiresAt','scope','idToken','password','createdAt','updatedAt']);

export const AdminPermissionScalarFieldEnumSchema = z.enum(['id','userId','entity','canCreate','canRead','canUpdate','canDelete','createdAt','updatedAt']);

export const AuditLogScalarFieldEnumSchema = z.enum(['id','userId','entity','entityId','action','changes','ipAddress','userAgent','createdAt']);

export const ClientScalarFieldEnumSchema = z.enum(['id','userId','companyName','billingAddress','billingCity','billingCountry','siret','stripeCustomerId','createdAt','updatedAt']);

export const DocumentScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','type','name','invoiceNumber','quoteNumber','contractRef','clientName','clientSiret','clientAddress','clientCity','clientCountry','providerId','providerName','providerLegal','providerSiret','providerAddress','providerCity','providerEmail','providerPhone','items','subtotal','tva','total','tvaRate','railwayEstimate','pdfUrl','fileSize','createdBy']);

export const MediaScalarFieldEnumSchema = z.enum(['id','url','key','mimeType','size','avatarUserId','coverUserId','createdAt']);

export const PaymentScalarFieldEnumSchema = z.enum(['id','clientId','amount','stripeFee','totalWithFees','description','status','frequency','dueDate','paidAt','stripePaymentIntentId','stripeSubscriptionId','attachedFiles','receiptUrl','createdAt','updatedAt']);

export const ProviderScalarFieldEnumSchema = z.enum(['id','name','legalName','address','city','country','siret','email','phone','bankName','iban','bic','logoUrl','tvaRate','createdAt','updatedAt']);

export const SessionScalarFieldEnumSchema = z.enum(['id','userId','token','expiresAt','ipAddress','userAgent','createdAt','updatedAt']);

export const SettingsScalarFieldEnumSchema = z.enum(['id','companyName','companyLegal','companyAddress','companyCity','companyCountry','companySiret','companyEmail','companyPhone','bankName','iban','bic','logoUrl','tvaRate','createdAt','updatedAt']);

export const UserScalarFieldEnumSchema = z.enum(['id','email','firstName','lastName','password','emailVerified','role','status','isBanned','banReason','bannedAt','bannedBy','isSuspended','suspendedUntil','suspensionReason','lastLoginAt','lastLoginIp','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','hashedIdentifier','hashedValue','expiresAt','createdAt','updatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema: z.ZodType<Prisma.NullableJsonNullValueInput> = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const JsonNullValueInputSchema: z.ZodType<Prisma.JsonNullValueInput> = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema: z.ZodType<Prisma.JsonNullValueFilter> = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const AuditActionSchema = z.enum(['CREATE','UPDATE','DELETE']);

export type AuditActionType = `${z.infer<typeof AuditActionSchema>}`

export const PaymentStatusSchema = z.enum(['PENDING','PAID','EXPIRED','CANCELLED']);

export type PaymentStatusType = `${z.infer<typeof PaymentStatusSchema>}`

export const PaymentFrequencySchema = z.enum(['ONE_TIME','MONTHLY','YEARLY']);

export type PaymentFrequencyType = `${z.infer<typeof PaymentFrequencySchema>}`

export const UserRoleSchema = z.enum(['ADMIN','CLIENT']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const UserStatusSchema = z.enum(['ACTIVE','SUSPENDED','BANNED','PENDING']);

export type UserStatusType = `${z.infer<typeof UserStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  idToken: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

// ACCOUNT RELATION SCHEMA
//------------------------------------------------------

export type AccountRelations = {
  user: UserWithRelations;
};

export type AccountWithRelations = z.infer<typeof AccountSchema> & AccountRelations

export const AccountWithRelationsSchema: z.ZodType<AccountWithRelations> = AccountSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// ADMIN PERMISSION SCHEMA
/////////////////////////////////////////

export const AdminPermissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  entity: z.string(),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AdminPermission = z.infer<typeof AdminPermissionSchema>

// ADMIN PERMISSION RELATION SCHEMA
//------------------------------------------------------

export type AdminPermissionRelations = {
  user: UserWithRelations;
};

export type AdminPermissionWithRelations = z.infer<typeof AdminPermissionSchema> & AdminPermissionRelations

export const AdminPermissionWithRelationsSchema: z.ZodType<AdminPermissionWithRelations> = AdminPermissionSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// AUDIT LOG SCHEMA
/////////////////////////////////////////

export const AuditLogSchema = z.object({
  action: AuditActionSchema,
  id: z.string(),
  userId: z.string(),
  entity: z.string(),
  entityId: z.string(),
  changes: JsonValueSchema.nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type AuditLog = z.infer<typeof AuditLogSchema>

// AUDIT LOG RELATION SCHEMA
//------------------------------------------------------

export type AuditLogRelations = {
  user: UserWithRelations;
};

export type AuditLogWithRelations = Omit<z.infer<typeof AuditLogSchema>, "changes"> & {
  changes?: JsonValueType | null;
} & AuditLogRelations

export const AuditLogWithRelationsSchema: z.ZodType<AuditLogWithRelations> = AuditLogSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// CLIENT SCHEMA
/////////////////////////////////////////

export const ClientSchema = z.object({
  id: z.string(),
  userId: z.string(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string(),
  siret: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Client = z.infer<typeof ClientSchema>

// CLIENT RELATION SCHEMA
//------------------------------------------------------

export type ClientRelations = {
  user: UserWithRelations;
  payments: PaymentWithRelations[];
};

export type ClientWithRelations = z.infer<typeof ClientSchema> & ClientRelations

export const ClientWithRelationsSchema: z.ZodType<ClientWithRelations> = ClientSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
  payments: z.lazy(() => PaymentWithRelationsSchema).array(),
}))

/////////////////////////////////////////
// DOCUMENT SCHEMA
/////////////////////////////////////////

export const DocumentSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().nullable(),
  quoteNumber: z.string().nullable(),
  contractRef: z.string().nullable(),
  clientName: z.string(),
  clientSiret: z.string().nullable(),
  clientAddress: z.string().nullable(),
  clientCity: z.string().nullable(),
  clientCountry: z.string().nullable(),
  providerId: z.string().nullable(),
  providerName: z.string(),
  providerLegal: z.string().nullable(),
  providerSiret: z.string().nullable(),
  providerAddress: z.string().nullable(),
  providerCity: z.string().nullable(),
  providerEmail: z.string().nullable(),
  providerPhone: z.string().nullable(),
  items: JsonValueSchema,
  subtotal: z.instanceof(Prisma.Decimal, { message: "Field 'subtotal' must be a Decimal. Location: ['Models', 'Document']"}),
  tva: z.instanceof(Prisma.Decimal, { message: "Field 'tva' must be a Decimal. Location: ['Models', 'Document']"}),
  total: z.instanceof(Prisma.Decimal, { message: "Field 'total' must be a Decimal. Location: ['Models', 'Document']"}),
  tvaRate: z.number(),
  railwayEstimate: z.instanceof(Prisma.Decimal, { message: "Field 'railwayEstimate' must be a Decimal. Location: ['Models', 'Document']"}).nullable(),
  pdfUrl: z.string().nullable(),
  fileSize: z.number().nullable(),
  createdBy: z.string(),
})

export type Document = z.infer<typeof DocumentSchema>

// DOCUMENT RELATION SCHEMA
//------------------------------------------------------

export type DocumentRelations = {
  provider?: ProviderWithRelations | null;
  createdByUser: UserWithRelations;
};

export type DocumentWithRelations = z.infer<typeof DocumentSchema> & DocumentRelations

export const DocumentWithRelationsSchema: z.ZodType<DocumentWithRelations> = DocumentSchema.merge(z.object({
  provider: z.lazy(() => ProviderWithRelationsSchema).nullable(),
  createdByUser: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// MEDIA SCHEMA
/////////////////////////////////////////

export const MediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().nullable(),
  coverUserId: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type Media = z.infer<typeof MediaSchema>

// MEDIA RELATION SCHEMA
//------------------------------------------------------

export type MediaRelations = {
  avatarUser?: UserWithRelations | null;
  coverUser?: UserWithRelations | null;
};

export type MediaWithRelations = z.infer<typeof MediaSchema> & MediaRelations

export const MediaWithRelationsSchema: z.ZodType<MediaWithRelations> = MediaSchema.merge(z.object({
  avatarUser: z.lazy(() => UserWithRelationsSchema).nullable(),
  coverUser: z.lazy(() => UserWithRelationsSchema).nullable(),
}))

/////////////////////////////////////////
// PAYMENT SCHEMA
/////////////////////////////////////////

export const PaymentSchema = z.object({
  status: PaymentStatusSchema,
  frequency: PaymentFrequencySchema,
  id: z.string(),
  clientId: z.string(),
  amount: z.instanceof(Prisma.Decimal, { message: "Field 'amount' must be a Decimal. Location: ['Models', 'Payment']"}),
  stripeFee: z.instanceof(Prisma.Decimal, { message: "Field 'stripeFee' must be a Decimal. Location: ['Models', 'Payment']"}),
  totalWithFees: z.instanceof(Prisma.Decimal, { message: "Field 'totalWithFees' must be a Decimal. Location: ['Models', 'Payment']"}),
  description: z.string(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  attachedFiles: z.string().array(),
  receiptUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payment = z.infer<typeof PaymentSchema>

// PAYMENT RELATION SCHEMA
//------------------------------------------------------

export type PaymentRelations = {
  client: ClientWithRelations;
};

export type PaymentWithRelations = z.infer<typeof PaymentSchema> & PaymentRelations

export const PaymentWithRelationsSchema: z.ZodType<PaymentWithRelations> = PaymentSchema.merge(z.object({
  client: z.lazy(() => ClientWithRelationsSchema),
}))

/////////////////////////////////////////
// PROVIDER SCHEMA
/////////////////////////////////////////

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  siret: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  bankName: z.string().nullable(),
  iban: z.string().nullable(),
  bic: z.string().nullable(),
  logoUrl: z.string().nullable(),
  tvaRate: z.instanceof(Prisma.Decimal, { message: "Field 'tvaRate' must be a Decimal. Location: ['Models', 'Provider']"}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Provider = z.infer<typeof ProviderSchema>

// PROVIDER RELATION SCHEMA
//------------------------------------------------------

export type ProviderRelations = {
  documents: DocumentWithRelations[];
};

export type ProviderWithRelations = z.infer<typeof ProviderSchema> & ProviderRelations

export const ProviderWithRelationsSchema: z.ZodType<ProviderWithRelations> = ProviderSchema.merge(z.object({
  documents: z.lazy(() => DocumentWithRelationsSchema).array(),
}))

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

// SESSION RELATION SCHEMA
//------------------------------------------------------

export type SessionRelations = {
  user: UserWithRelations;
};

export type SessionWithRelations = z.infer<typeof SessionSchema> & SessionRelations

export const SessionWithRelationsSchema: z.ZodType<SessionWithRelations> = SessionSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// SETTINGS SCHEMA
/////////////////////////////////////////

export const SettingsSchema = z.object({
  id: z.string(),
  companyName: z.string().nullable(),
  companyLegal: z.string().nullable(),
  companyAddress: z.string().nullable(),
  companyCity: z.string().nullable(),
  companyCountry: z.string(),
  companySiret: z.string().nullable(),
  companyEmail: z.string().nullable(),
  companyPhone: z.string().nullable(),
  bankName: z.string().nullable(),
  iban: z.string().nullable(),
  bic: z.string().nullable(),
  logoUrl: z.string().nullable(),
  tvaRate: z.instanceof(Prisma.Decimal, { message: "Field 'tvaRate' must be a Decimal. Location: ['Models', 'Settings']"}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Settings = z.infer<typeof SettingsSchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  role: UserRoleSchema,
  status: UserStatusSchema,
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean(),
  isBanned: z.boolean(),
  banReason: z.string().nullable(),
  bannedAt: z.coerce.date().nullable(),
  bannedBy: z.string().nullable(),
  isSuspended: z.boolean(),
  suspendedUntil: z.coerce.date().nullable(),
  suspensionReason: z.string().nullable(),
  lastLoginAt: z.coerce.date().nullable(),
  lastLoginIp: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

// USER RELATION SCHEMA
//------------------------------------------------------

export type UserRelations = {
  avatar?: MediaWithRelations | null;
  coverImage?: MediaWithRelations | null;
  sessions: SessionWithRelations[];
  accounts: AccountWithRelations[];
  auditLogs: AuditLogWithRelations[];
  adminPermissions: AdminPermissionWithRelations[];
  client?: ClientWithRelations | null;
  documents: DocumentWithRelations[];
};

export type UserWithRelations = z.infer<typeof UserSchema> & UserRelations

export const UserWithRelationsSchema: z.ZodType<UserWithRelations> = UserSchema.merge(z.object({
  avatar: z.lazy(() => MediaWithRelationsSchema).nullable(),
  coverImage: z.lazy(() => MediaWithRelationsSchema).nullable(),
  sessions: z.lazy(() => SessionWithRelationsSchema).array(),
  accounts: z.lazy(() => AccountWithRelationsSchema).array(),
  auditLogs: z.lazy(() => AuditLogWithRelationsSchema).array(),
  adminPermissions: z.lazy(() => AdminPermissionWithRelationsSchema).array(),
  client: z.lazy(() => ClientWithRelationsSchema).nullable(),
  documents: z.lazy(() => DocumentWithRelationsSchema).array(),
}))

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// ACCOUNT
//------------------------------------------------------

export const AccountIncludeSchema: z.ZodType<Prisma.AccountInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const AccountArgsSchema: z.ZodType<Prisma.AccountDefaultArgs> = z.object({
  select: z.lazy(() => AccountSelectSchema).optional(),
  include: z.lazy(() => AccountIncludeSchema).optional(),
}).strict();

export const AccountSelectSchema: z.ZodType<Prisma.AccountSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  accountId: z.boolean().optional(),
  providerId: z.boolean().optional(),
  accessToken: z.boolean().optional(),
  refreshToken: z.boolean().optional(),
  accessTokenExpiresAt: z.boolean().optional(),
  refreshTokenExpiresAt: z.boolean().optional(),
  scope: z.boolean().optional(),
  idToken: z.boolean().optional(),
  password: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// ADMIN PERMISSION
//------------------------------------------------------

export const AdminPermissionIncludeSchema: z.ZodType<Prisma.AdminPermissionInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const AdminPermissionArgsSchema: z.ZodType<Prisma.AdminPermissionDefaultArgs> = z.object({
  select: z.lazy(() => AdminPermissionSelectSchema).optional(),
  include: z.lazy(() => AdminPermissionIncludeSchema).optional(),
}).strict();

export const AdminPermissionSelectSchema: z.ZodType<Prisma.AdminPermissionSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  entity: z.boolean().optional(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// AUDIT LOG
//------------------------------------------------------

export const AuditLogIncludeSchema: z.ZodType<Prisma.AuditLogInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const AuditLogArgsSchema: z.ZodType<Prisma.AuditLogDefaultArgs> = z.object({
  select: z.lazy(() => AuditLogSelectSchema).optional(),
  include: z.lazy(() => AuditLogIncludeSchema).optional(),
}).strict();

export const AuditLogSelectSchema: z.ZodType<Prisma.AuditLogSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  entity: z.boolean().optional(),
  entityId: z.boolean().optional(),
  action: z.boolean().optional(),
  changes: z.boolean().optional(),
  ipAddress: z.boolean().optional(),
  userAgent: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// CLIENT
//------------------------------------------------------

export const ClientIncludeSchema: z.ZodType<Prisma.ClientInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  payments: z.union([z.boolean(),z.lazy(() => PaymentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ClientCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const ClientArgsSchema: z.ZodType<Prisma.ClientDefaultArgs> = z.object({
  select: z.lazy(() => ClientSelectSchema).optional(),
  include: z.lazy(() => ClientIncludeSchema).optional(),
}).strict();

export const ClientCountOutputTypeArgsSchema: z.ZodType<Prisma.ClientCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ClientCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ClientCountOutputTypeSelectSchema: z.ZodType<Prisma.ClientCountOutputTypeSelect> = z.object({
  payments: z.boolean().optional(),
}).strict();

export const ClientSelectSchema: z.ZodType<Prisma.ClientSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  companyName: z.boolean().optional(),
  billingAddress: z.boolean().optional(),
  billingCity: z.boolean().optional(),
  billingCountry: z.boolean().optional(),
  siret: z.boolean().optional(),
  stripeCustomerId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  payments: z.union([z.boolean(),z.lazy(() => PaymentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ClientCountOutputTypeArgsSchema)]).optional(),
}).strict()

// DOCUMENT
//------------------------------------------------------

export const DocumentIncludeSchema: z.ZodType<Prisma.DocumentInclude> = z.object({
  provider: z.union([z.boolean(),z.lazy(() => ProviderArgsSchema)]).optional(),
  createdByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const DocumentArgsSchema: z.ZodType<Prisma.DocumentDefaultArgs> = z.object({
  select: z.lazy(() => DocumentSelectSchema).optional(),
  include: z.lazy(() => DocumentIncludeSchema).optional(),
}).strict();

export const DocumentSelectSchema: z.ZodType<Prisma.DocumentSelect> = z.object({
  id: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  type: z.boolean().optional(),
  name: z.boolean().optional(),
  invoiceNumber: z.boolean().optional(),
  quoteNumber: z.boolean().optional(),
  contractRef: z.boolean().optional(),
  clientName: z.boolean().optional(),
  clientSiret: z.boolean().optional(),
  clientAddress: z.boolean().optional(),
  clientCity: z.boolean().optional(),
  clientCountry: z.boolean().optional(),
  providerId: z.boolean().optional(),
  providerName: z.boolean().optional(),
  providerLegal: z.boolean().optional(),
  providerSiret: z.boolean().optional(),
  providerAddress: z.boolean().optional(),
  providerCity: z.boolean().optional(),
  providerEmail: z.boolean().optional(),
  providerPhone: z.boolean().optional(),
  items: z.boolean().optional(),
  subtotal: z.boolean().optional(),
  tva: z.boolean().optional(),
  total: z.boolean().optional(),
  tvaRate: z.boolean().optional(),
  railwayEstimate: z.boolean().optional(),
  pdfUrl: z.boolean().optional(),
  fileSize: z.boolean().optional(),
  createdBy: z.boolean().optional(),
  provider: z.union([z.boolean(),z.lazy(() => ProviderArgsSchema)]).optional(),
  createdByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// MEDIA
//------------------------------------------------------

export const MediaIncludeSchema: z.ZodType<Prisma.MediaInclude> = z.object({
  avatarUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  coverUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const MediaArgsSchema: z.ZodType<Prisma.MediaDefaultArgs> = z.object({
  select: z.lazy(() => MediaSelectSchema).optional(),
  include: z.lazy(() => MediaIncludeSchema).optional(),
}).strict();

export const MediaSelectSchema: z.ZodType<Prisma.MediaSelect> = z.object({
  id: z.boolean().optional(),
  url: z.boolean().optional(),
  key: z.boolean().optional(),
  mimeType: z.boolean().optional(),
  size: z.boolean().optional(),
  avatarUserId: z.boolean().optional(),
  coverUserId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  avatarUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  coverUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// PAYMENT
//------------------------------------------------------

export const PaymentIncludeSchema: z.ZodType<Prisma.PaymentInclude> = z.object({
  client: z.union([z.boolean(),z.lazy(() => ClientArgsSchema)]).optional(),
}).strict();

export const PaymentArgsSchema: z.ZodType<Prisma.PaymentDefaultArgs> = z.object({
  select: z.lazy(() => PaymentSelectSchema).optional(),
  include: z.lazy(() => PaymentIncludeSchema).optional(),
}).strict();

export const PaymentSelectSchema: z.ZodType<Prisma.PaymentSelect> = z.object({
  id: z.boolean().optional(),
  clientId: z.boolean().optional(),
  amount: z.boolean().optional(),
  stripeFee: z.boolean().optional(),
  totalWithFees: z.boolean().optional(),
  description: z.boolean().optional(),
  status: z.boolean().optional(),
  frequency: z.boolean().optional(),
  dueDate: z.boolean().optional(),
  paidAt: z.boolean().optional(),
  stripePaymentIntentId: z.boolean().optional(),
  stripeSubscriptionId: z.boolean().optional(),
  attachedFiles: z.boolean().optional(),
  receiptUrl: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  client: z.union([z.boolean(),z.lazy(() => ClientArgsSchema)]).optional(),
}).strict()

// PROVIDER
//------------------------------------------------------

export const ProviderIncludeSchema: z.ZodType<Prisma.ProviderInclude> = z.object({
  documents: z.union([z.boolean(),z.lazy(() => DocumentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ProviderCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const ProviderArgsSchema: z.ZodType<Prisma.ProviderDefaultArgs> = z.object({
  select: z.lazy(() => ProviderSelectSchema).optional(),
  include: z.lazy(() => ProviderIncludeSchema).optional(),
}).strict();

export const ProviderCountOutputTypeArgsSchema: z.ZodType<Prisma.ProviderCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ProviderCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ProviderCountOutputTypeSelectSchema: z.ZodType<Prisma.ProviderCountOutputTypeSelect> = z.object({
  documents: z.boolean().optional(),
}).strict();

export const ProviderSelectSchema: z.ZodType<Prisma.ProviderSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  legalName: z.boolean().optional(),
  address: z.boolean().optional(),
  city: z.boolean().optional(),
  country: z.boolean().optional(),
  siret: z.boolean().optional(),
  email: z.boolean().optional(),
  phone: z.boolean().optional(),
  bankName: z.boolean().optional(),
  iban: z.boolean().optional(),
  bic: z.boolean().optional(),
  logoUrl: z.boolean().optional(),
  tvaRate: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  documents: z.union([z.boolean(),z.lazy(() => DocumentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ProviderCountOutputTypeArgsSchema)]).optional(),
}).strict()

// SESSION
//------------------------------------------------------

export const SessionIncludeSchema: z.ZodType<Prisma.SessionInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const SessionArgsSchema: z.ZodType<Prisma.SessionDefaultArgs> = z.object({
  select: z.lazy(() => SessionSelectSchema).optional(),
  include: z.lazy(() => SessionIncludeSchema).optional(),
}).strict();

export const SessionSelectSchema: z.ZodType<Prisma.SessionSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  token: z.boolean().optional(),
  expiresAt: z.boolean().optional(),
  ipAddress: z.boolean().optional(),
  userAgent: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// SETTINGS
//------------------------------------------------------

export const SettingsSelectSchema: z.ZodType<Prisma.SettingsSelect> = z.object({
  id: z.boolean().optional(),
  companyName: z.boolean().optional(),
  companyLegal: z.boolean().optional(),
  companyAddress: z.boolean().optional(),
  companyCity: z.boolean().optional(),
  companyCountry: z.boolean().optional(),
  companySiret: z.boolean().optional(),
  companyEmail: z.boolean().optional(),
  companyPhone: z.boolean().optional(),
  bankName: z.boolean().optional(),
  iban: z.boolean().optional(),
  bic: z.boolean().optional(),
  logoUrl: z.boolean().optional(),
  tvaRate: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  avatar: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  coverImage: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  auditLogs: z.union([z.boolean(),z.lazy(() => AuditLogFindManyArgsSchema)]).optional(),
  adminPermissions: z.union([z.boolean(),z.lazy(() => AdminPermissionFindManyArgsSchema)]).optional(),
  client: z.union([z.boolean(),z.lazy(() => ClientArgsSchema)]).optional(),
  documents: z.union([z.boolean(),z.lazy(() => DocumentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z.object({
  select: z.lazy(() => UserSelectSchema).optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
}).strict();

export const UserCountOutputTypeArgsSchema: z.ZodType<Prisma.UserCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserCountOutputTypeSelectSchema).nullish(),
}).strict();

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z.object({
  sessions: z.boolean().optional(),
  accounts: z.boolean().optional(),
  auditLogs: z.boolean().optional(),
  adminPermissions: z.boolean().optional(),
  documents: z.boolean().optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  firstName: z.boolean().optional(),
  lastName: z.boolean().optional(),
  password: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  role: z.boolean().optional(),
  status: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.boolean().optional(),
  bannedAt: z.boolean().optional(),
  bannedBy: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.boolean().optional(),
  suspensionReason: z.boolean().optional(),
  lastLoginAt: z.boolean().optional(),
  lastLoginIp: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  avatar: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  coverImage: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  auditLogs: z.union([z.boolean(),z.lazy(() => AuditLogFindManyArgsSchema)]).optional(),
  adminPermissions: z.union([z.boolean(),z.lazy(() => AdminPermissionFindManyArgsSchema)]).optional(),
  client: z.union([z.boolean(),z.lazy(() => ClientArgsSchema)]).optional(),
  documents: z.union([z.boolean(),z.lazy(() => DocumentFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

// VERIFICATION
//------------------------------------------------------

export const VerificationSelectSchema: z.ZodType<Prisma.VerificationSelect> = z.object({
  id: z.boolean().optional(),
  hashedIdentifier: z.boolean().optional(),
  hashedValue: z.boolean().optional(),
  expiresAt: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const AccountWhereInputSchema: z.ZodType<Prisma.AccountWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AccountWhereInputSchema), z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountWhereInputSchema), z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accountId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accessToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  refreshToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  idToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  password: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const AccountOrderByWithRelationInputSchema: z.ZodType<Prisma.AccountOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  accountId: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  accessToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  refreshToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  accessTokenExpiresAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  idToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  password: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const AccountWhereUniqueInputSchema: z.ZodType<Prisma.AccountWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    providerId_accountId: z.lazy(() => AccountProviderIdAccountIdCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    providerId_accountId: z.lazy(() => AccountProviderIdAccountIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  providerId_accountId: z.lazy(() => AccountProviderIdAccountIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => AccountWhereInputSchema), z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountWhereInputSchema), z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accountId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accessToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  refreshToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  idToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  password: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const AccountOrderByWithAggregationInputSchema: z.ZodType<Prisma.AccountOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  accountId: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  accessToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  refreshToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  accessTokenExpiresAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  idToken: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  password: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AccountCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AccountMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AccountMinOrderByAggregateInputSchema).optional(),
}).strict();

export const AccountScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AccountScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AccountScalarWhereWithAggregatesInputSchema), z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountScalarWhereWithAggregatesInputSchema), z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  accountId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  providerId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  accessToken: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  refreshToken: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  idToken: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  password: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AdminPermissionWhereInputSchema: z.ZodType<Prisma.AdminPermissionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AdminPermissionWhereInputSchema), z.lazy(() => AdminPermissionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AdminPermissionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AdminPermissionWhereInputSchema), z.lazy(() => AdminPermissionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  canCreate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canRead: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canUpdate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canDelete: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const AdminPermissionOrderByWithRelationInputSchema: z.ZodType<Prisma.AdminPermissionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  canCreate: z.lazy(() => SortOrderSchema).optional(),
  canRead: z.lazy(() => SortOrderSchema).optional(),
  canUpdate: z.lazy(() => SortOrderSchema).optional(),
  canDelete: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const AdminPermissionWhereUniqueInputSchema: z.ZodType<Prisma.AdminPermissionWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    userId_entity: z.lazy(() => AdminPermissionUserIdEntityCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    userId_entity: z.lazy(() => AdminPermissionUserIdEntityCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  userId_entity: z.lazy(() => AdminPermissionUserIdEntityCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => AdminPermissionWhereInputSchema), z.lazy(() => AdminPermissionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AdminPermissionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AdminPermissionWhereInputSchema), z.lazy(() => AdminPermissionWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  canCreate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canRead: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canUpdate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canDelete: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const AdminPermissionOrderByWithAggregationInputSchema: z.ZodType<Prisma.AdminPermissionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  canCreate: z.lazy(() => SortOrderSchema).optional(),
  canRead: z.lazy(() => SortOrderSchema).optional(),
  canUpdate: z.lazy(() => SortOrderSchema).optional(),
  canDelete: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AdminPermissionCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AdminPermissionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AdminPermissionMinOrderByAggregateInputSchema).optional(),
}).strict();

export const AdminPermissionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AdminPermissionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AdminPermissionScalarWhereWithAggregatesInputSchema), z.lazy(() => AdminPermissionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AdminPermissionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AdminPermissionScalarWhereWithAggregatesInputSchema), z.lazy(() => AdminPermissionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  canCreate: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  canRead: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  canUpdate: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  canDelete: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AuditLogWhereInputSchema: z.ZodType<Prisma.AuditLogWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AuditLogWhereInputSchema), z.lazy(() => AuditLogWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AuditLogWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AuditLogWhereInputSchema), z.lazy(() => AuditLogWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entityId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  action: z.union([ z.lazy(() => EnumAuditActionFilterSchema), z.lazy(() => AuditActionSchema) ]).optional(),
  changes: z.lazy(() => JsonNullableFilterSchema).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const AuditLogOrderByWithRelationInputSchema: z.ZodType<Prisma.AuditLogOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  entityId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  changes: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  ipAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  userAgent: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const AuditLogWhereUniqueInputSchema: z.ZodType<Prisma.AuditLogWhereUniqueInput> = z.object({
  id: z.string(),
})
.and(z.object({
  id: z.string().optional(),
  AND: z.union([ z.lazy(() => AuditLogWhereInputSchema), z.lazy(() => AuditLogWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AuditLogWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AuditLogWhereInputSchema), z.lazy(() => AuditLogWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entityId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  action: z.union([ z.lazy(() => EnumAuditActionFilterSchema), z.lazy(() => AuditActionSchema) ]).optional(),
  changes: z.lazy(() => JsonNullableFilterSchema).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const AuditLogOrderByWithAggregationInputSchema: z.ZodType<Prisma.AuditLogOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  entityId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  changes: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  ipAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  userAgent: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AuditLogCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AuditLogMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AuditLogMinOrderByAggregateInputSchema).optional(),
}).strict();

export const AuditLogScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AuditLogScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AuditLogScalarWhereWithAggregatesInputSchema), z.lazy(() => AuditLogScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AuditLogScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AuditLogScalarWhereWithAggregatesInputSchema), z.lazy(() => AuditLogScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  entityId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  action: z.union([ z.lazy(() => EnumAuditActionWithAggregatesFilterSchema), z.lazy(() => AuditActionSchema) ]).optional(),
  changes: z.lazy(() => JsonNullableWithAggregatesFilterSchema).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const ClientWhereInputSchema: z.ZodType<Prisma.ClientWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ClientWhereInputSchema), z.lazy(() => ClientWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ClientWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ClientWhereInputSchema), z.lazy(() => ClientWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  companyName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingAddress: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingCity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingCountry: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  stripeCustomerId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  payments: z.lazy(() => PaymentListRelationFilterSchema).optional(),
}).strict();

export const ClientOrderByWithRelationInputSchema: z.ZodType<Prisma.ClientOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  billingAddress: z.lazy(() => SortOrderSchema).optional(),
  billingCity: z.lazy(() => SortOrderSchema).optional(),
  billingCountry: z.lazy(() => SortOrderSchema).optional(),
  siret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripeCustomerId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  payments: z.lazy(() => PaymentOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const ClientWhereUniqueInputSchema: z.ZodType<Prisma.ClientWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    userId: z.string(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    id: z.string(),
    userId: z.string(),
  }),
  z.object({
    id: z.string(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    userId: z.string(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    userId: z.string(),
  }),
  z.object({
    stripeCustomerId: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  AND: z.union([ z.lazy(() => ClientWhereInputSchema), z.lazy(() => ClientWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ClientWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ClientWhereInputSchema), z.lazy(() => ClientWhereInputSchema).array() ]).optional(),
  companyName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingAddress: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingCity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  billingCountry: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  payments: z.lazy(() => PaymentListRelationFilterSchema).optional(),
}).strict());

export const ClientOrderByWithAggregationInputSchema: z.ZodType<Prisma.ClientOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  billingAddress: z.lazy(() => SortOrderSchema).optional(),
  billingCity: z.lazy(() => SortOrderSchema).optional(),
  billingCountry: z.lazy(() => SortOrderSchema).optional(),
  siret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripeCustomerId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ClientCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ClientMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ClientMinOrderByAggregateInputSchema).optional(),
}).strict();

export const ClientScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ClientScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ClientScalarWhereWithAggregatesInputSchema), z.lazy(() => ClientScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ClientScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ClientScalarWhereWithAggregatesInputSchema), z.lazy(() => ClientScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  companyName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  billingAddress: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  billingCity: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  billingCountry: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  stripeCustomerId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const DocumentWhereInputSchema: z.ZodType<Prisma.DocumentWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DocumentWhereInputSchema), z.lazy(() => DocumentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DocumentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DocumentWhereInputSchema), z.lazy(() => DocumentWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  invoiceNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  quoteNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  contractRef: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  clientSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCountry: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerLegal: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerEmail: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerPhone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  items: z.lazy(() => JsonFilterSchema).optional(),
  subtotal: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tva: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  total: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tvaRate: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  railwayEstimate: z.union([ z.lazy(() => DecimalNullableFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional().nullable(),
  pdfUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  fileSize: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  createdBy: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  provider: z.union([ z.lazy(() => ProviderNullableScalarRelationFilterSchema), z.lazy(() => ProviderWhereInputSchema) ]).optional().nullable(),
  createdByUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const DocumentOrderByWithRelationInputSchema: z.ZodType<Prisma.DocumentOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  invoiceNumber: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  quoteNumber: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  contractRef: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientName: z.lazy(() => SortOrderSchema).optional(),
  clientSiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientCountry: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerName: z.lazy(() => SortOrderSchema).optional(),
  providerLegal: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerSiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerEmail: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerPhone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  items: z.lazy(() => SortOrderSchema).optional(),
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  pdfUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  fileSize: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => ProviderOrderByWithRelationInputSchema).optional(),
  createdByUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const DocumentWhereUniqueInputSchema: z.ZodType<Prisma.DocumentWhereUniqueInput> = z.object({
  id: z.string(),
})
.and(z.object({
  id: z.string().optional(),
  AND: z.union([ z.lazy(() => DocumentWhereInputSchema), z.lazy(() => DocumentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DocumentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DocumentWhereInputSchema), z.lazy(() => DocumentWhereInputSchema).array() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  invoiceNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  quoteNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  contractRef: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  clientSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCountry: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerLegal: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerEmail: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerPhone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  items: z.lazy(() => JsonFilterSchema).optional(),
  subtotal: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tva: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  total: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tvaRate: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  railwayEstimate: z.union([ z.lazy(() => DecimalNullableFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional().nullable(),
  pdfUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  fileSize: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  createdBy: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  provider: z.union([ z.lazy(() => ProviderNullableScalarRelationFilterSchema), z.lazy(() => ProviderWhereInputSchema) ]).optional().nullable(),
  createdByUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const DocumentOrderByWithAggregationInputSchema: z.ZodType<Prisma.DocumentOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  invoiceNumber: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  quoteNumber: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  contractRef: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientName: z.lazy(() => SortOrderSchema).optional(),
  clientSiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  clientCountry: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerName: z.lazy(() => SortOrderSchema).optional(),
  providerLegal: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerSiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerEmail: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  providerPhone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  items: z.lazy(() => SortOrderSchema).optional(),
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  pdfUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  fileSize: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => DocumentCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DocumentAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DocumentMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DocumentMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DocumentSumOrderByAggregateInputSchema).optional(),
}).strict();

export const DocumentScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DocumentScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DocumentScalarWhereWithAggregatesInputSchema), z.lazy(() => DocumentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DocumentScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DocumentScalarWhereWithAggregatesInputSchema), z.lazy(() => DocumentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  type: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  invoiceNumber: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  quoteNumber: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  contractRef: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  clientName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  clientSiret: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  clientAddress: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  clientCity: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  clientCountry: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  providerLegal: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerSiret: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerAddress: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerCity: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerEmail: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  providerPhone: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  items: z.lazy(() => JsonWithAggregatesFilterSchema).optional(),
  subtotal: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tva: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  total: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tvaRate: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  railwayEstimate: z.union([ z.lazy(() => DecimalNullableWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional().nullable(),
  pdfUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  fileSize: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema), z.number() ]).optional().nullable(),
  createdBy: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
}).strict();

export const MediaWhereInputSchema: z.ZodType<Prisma.MediaWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MediaWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  key: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  size: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  avatarUserId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  coverUserId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatarUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  coverUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
}).strict();

export const MediaOrderByWithRelationInputSchema: z.ZodType<Prisma.MediaOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  coverUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  avatarUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  coverUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const MediaWhereUniqueInputSchema: z.ZodType<Prisma.MediaWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    key: z.string(),
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.string(),
    key: z.string(),
    avatarUserId: z.string(),
  }),
  z.object({
    id: z.string(),
    key: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.string(),
    key: z.string(),
  }),
  z.object({
    id: z.string(),
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.string(),
    avatarUserId: z.string(),
  }),
  z.object({
    id: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    key: z.string(),
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    key: z.string(),
    avatarUserId: z.string(),
  }),
  z.object({
    key: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    key: z.string(),
  }),
  z.object({
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    avatarUserId: z.string(),
  }),
  z.object({
    coverUserId: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  key: z.string().optional(),
  avatarUserId: z.string().optional(),
  coverUserId: z.string().optional(),
  AND: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MediaWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  url: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  size: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatarUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  coverUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
}).strict());

export const MediaOrderByWithAggregationInputSchema: z.ZodType<Prisma.MediaOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  coverUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MediaCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MediaAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MediaMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MediaMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MediaSumOrderByAggregateInputSchema).optional(),
}).strict();

export const MediaScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MediaScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MediaScalarWhereWithAggregatesInputSchema), z.lazy(() => MediaScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MediaScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MediaScalarWhereWithAggregatesInputSchema), z.lazy(() => MediaScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  key: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  mimeType: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  size: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  avatarUserId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  coverUserId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const PaymentWhereInputSchema: z.ZodType<Prisma.PaymentWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PaymentWhereInputSchema), z.lazy(() => PaymentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentWhereInputSchema), z.lazy(() => PaymentWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  clientId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  stripeFee: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  totalWithFees: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumPaymentStatusFilterSchema), z.lazy(() => PaymentStatusSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => EnumPaymentFrequencyFilterSchema), z.lazy(() => PaymentFrequencySchema) ]).optional(),
  dueDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paidAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  attachedFiles: z.lazy(() => StringNullableListFilterSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  client: z.union([ z.lazy(() => ClientScalarRelationFilterSchema), z.lazy(() => ClientWhereInputSchema) ]).optional(),
}).strict();

export const PaymentOrderByWithRelationInputSchema: z.ZodType<Prisma.PaymentOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  clientId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  frequency: z.lazy(() => SortOrderSchema).optional(),
  dueDate: z.lazy(() => SortOrderSchema).optional(),
  paidAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripePaymentIntentId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  attachedFiles: z.lazy(() => SortOrderSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  client: z.lazy(() => ClientOrderByWithRelationInputSchema).optional(),
}).strict();

export const PaymentWhereUniqueInputSchema: z.ZodType<Prisma.PaymentWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    stripePaymentIntentId: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    stripePaymentIntentId: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  AND: z.union([ z.lazy(() => PaymentWhereInputSchema), z.lazy(() => PaymentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentWhereInputSchema), z.lazy(() => PaymentWhereInputSchema).array() ]).optional(),
  clientId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  stripeFee: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  totalWithFees: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumPaymentStatusFilterSchema), z.lazy(() => PaymentStatusSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => EnumPaymentFrequencyFilterSchema), z.lazy(() => PaymentFrequencySchema) ]).optional(),
  dueDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paidAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  attachedFiles: z.lazy(() => StringNullableListFilterSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  client: z.union([ z.lazy(() => ClientScalarRelationFilterSchema), z.lazy(() => ClientWhereInputSchema) ]).optional(),
}).strict());

export const PaymentOrderByWithAggregationInputSchema: z.ZodType<Prisma.PaymentOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  clientId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  frequency: z.lazy(() => SortOrderSchema).optional(),
  dueDate: z.lazy(() => SortOrderSchema).optional(),
  paidAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripePaymentIntentId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  attachedFiles: z.lazy(() => SortOrderSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => PaymentCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => PaymentAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => PaymentMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => PaymentMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => PaymentSumOrderByAggregateInputSchema).optional(),
}).strict();

export const PaymentScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.PaymentScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => PaymentScalarWhereWithAggregatesInputSchema), z.lazy(() => PaymentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentScalarWhereWithAggregatesInputSchema), z.lazy(() => PaymentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  clientId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  stripeFee: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  totalWithFees: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  description: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumPaymentStatusWithAggregatesFilterSchema), z.lazy(() => PaymentStatusSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => EnumPaymentFrequencyWithAggregatesFilterSchema), z.lazy(() => PaymentFrequencySchema) ]).optional(),
  dueDate: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  paidAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  attachedFiles: z.lazy(() => StringNullableListFilterSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const ProviderWhereInputSchema: z.ZodType<Prisma.ProviderWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProviderWhereInputSchema), z.lazy(() => ProviderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProviderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProviderWhereInputSchema), z.lazy(() => ProviderWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  legalName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  address: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  city: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  country: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  documents: z.lazy(() => DocumentListRelationFilterSchema).optional(),
}).strict();

export const ProviderOrderByWithRelationInputSchema: z.ZodType<Prisma.ProviderOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  legalName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  address: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  city: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  siret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  email: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bankName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  iban: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bic: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  logoUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  documents: z.lazy(() => DocumentOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const ProviderWhereUniqueInputSchema: z.ZodType<Prisma.ProviderWhereUniqueInput> = z.object({
  id: z.string(),
})
.and(z.object({
  id: z.string().optional(),
  AND: z.union([ z.lazy(() => ProviderWhereInputSchema), z.lazy(() => ProviderWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProviderWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProviderWhereInputSchema), z.lazy(() => ProviderWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  legalName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  address: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  city: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  country: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  phone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  documents: z.lazy(() => DocumentListRelationFilterSchema).optional(),
}).strict());

export const ProviderOrderByWithAggregationInputSchema: z.ZodType<Prisma.ProviderOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  legalName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  address: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  city: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  siret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  email: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  phone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bankName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  iban: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bic: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  logoUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ProviderCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ProviderAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ProviderMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ProviderMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ProviderSumOrderByAggregateInputSchema).optional(),
}).strict();

export const ProviderScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ProviderScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ProviderScalarWhereWithAggregatesInputSchema), z.lazy(() => ProviderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProviderScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProviderScalarWhereWithAggregatesInputSchema), z.lazy(() => ProviderScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  legalName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  address: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  city: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  country: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  siret: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  phone: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const SessionWhereInputSchema: z.ZodType<Prisma.SessionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SessionWhereInputSchema), z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionWhereInputSchema), z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const SessionOrderByWithRelationInputSchema: z.ZodType<Prisma.SessionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  userAgent: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
}).strict();

export const SessionWhereUniqueInputSchema: z.ZodType<Prisma.SessionWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    token: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    token: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  token: z.string().optional(),
  AND: z.union([ z.lazy(() => SessionWhereInputSchema), z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionWhereInputSchema), z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const SessionOrderByWithAggregationInputSchema: z.ZodType<Prisma.SessionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  userAgent: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SessionCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SessionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SessionMinOrderByAggregateInputSchema).optional(),
}).strict();

export const SessionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SessionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SessionScalarWhereWithAggregatesInputSchema), z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionScalarWhereWithAggregatesInputSchema), z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const SettingsWhereInputSchema: z.ZodType<Prisma.SettingsWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SettingsWhereInputSchema), z.lazy(() => SettingsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SettingsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SettingsWhereInputSchema), z.lazy(() => SettingsWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  companyName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyLegal: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyCountry: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  companySiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyEmail: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyPhone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const SettingsOrderByWithRelationInputSchema: z.ZodType<Prisma.SettingsOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyLegal: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyCountry: z.lazy(() => SortOrderSchema).optional(),
  companySiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyEmail: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyPhone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bankName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  iban: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bic: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  logoUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsWhereUniqueInputSchema: z.ZodType<Prisma.SettingsWhereUniqueInput> = z.object({
  id: z.string(),
})
.and(z.object({
  id: z.string().optional(),
  AND: z.union([ z.lazy(() => SettingsWhereInputSchema), z.lazy(() => SettingsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SettingsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SettingsWhereInputSchema), z.lazy(() => SettingsWhereInputSchema).array() ]).optional(),
  companyName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyLegal: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyCountry: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  companySiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyEmail: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  companyPhone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict());

export const SettingsOrderByWithAggregationInputSchema: z.ZodType<Prisma.SettingsOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyLegal: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyCity: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyCountry: z.lazy(() => SortOrderSchema).optional(),
  companySiret: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyEmail: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  companyPhone: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bankName: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  iban: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bic: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  logoUrl: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SettingsCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => SettingsAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SettingsMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SettingsMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => SettingsSumOrderByAggregateInputSchema).optional(),
}).strict();

export const SettingsScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SettingsScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SettingsScalarWhereWithAggregatesInputSchema), z.lazy(() => SettingsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SettingsScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SettingsScalarWhereWithAggregatesInputSchema), z.lazy(() => SettingsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  companyName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyLegal: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyAddress: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyCity: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyCountry: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  companySiret: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyEmail: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  companyPhone: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  bankName: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  iban: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  bic: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  tvaRate: z.union([ z.lazy(() => DecimalWithAggregatesFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  firstName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  role: z.union([ z.lazy(() => EnumUserRoleFilterSchema), z.lazy(() => UserRoleSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumUserStatusFilterSchema), z.lazy(() => UserStatusSchema) ]).optional(),
  isBanned: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  banReason: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bannedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  bannedBy: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  isSuspended: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  suspendedUntil: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  suspensionReason: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  lastLoginIp: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatar: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  coverImage: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  auditLogs: z.lazy(() => AuditLogListRelationFilterSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionListRelationFilterSchema).optional(),
  client: z.union([ z.lazy(() => ClientNullableScalarRelationFilterSchema), z.lazy(() => ClientWhereInputSchema) ]).optional().nullable(),
  documents: z.lazy(() => DocumentListRelationFilterSchema).optional(),
}).strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  isBanned: z.lazy(() => SortOrderSchema).optional(),
  banReason: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bannedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bannedBy: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  isSuspended: z.lazy(() => SortOrderSchema).optional(),
  suspendedUntil: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  suspensionReason: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastLoginIp: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  avatar: z.lazy(() => MediaOrderByWithRelationInputSchema).optional(),
  coverImage: z.lazy(() => MediaOrderByWithRelationInputSchema).optional(),
  sessions: z.lazy(() => SessionOrderByRelationAggregateInputSchema).optional(),
  accounts: z.lazy(() => AccountOrderByRelationAggregateInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogOrderByRelationAggregateInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionOrderByRelationAggregateInputSchema).optional(),
  client: z.lazy(() => ClientOrderByWithRelationInputSchema).optional(),
  documents: z.lazy(() => DocumentOrderByRelationAggregateInputSchema).optional(),
}).strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    email: z.string(),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    email: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  AND: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  firstName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  role: z.union([ z.lazy(() => EnumUserRoleFilterSchema), z.lazy(() => UserRoleSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumUserStatusFilterSchema), z.lazy(() => UserStatusSchema) ]).optional(),
  isBanned: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  banReason: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  bannedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  bannedBy: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  isSuspended: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  suspendedUntil: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  suspensionReason: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  lastLoginIp: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatar: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  coverImage: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  auditLogs: z.lazy(() => AuditLogListRelationFilterSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionListRelationFilterSchema).optional(),
  client: z.union([ z.lazy(() => ClientNullableScalarRelationFilterSchema), z.lazy(() => ClientWhereInputSchema) ]).optional().nullable(),
  documents: z.lazy(() => DocumentListRelationFilterSchema).optional(),
}).strict());

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  isBanned: z.lazy(() => SortOrderSchema).optional(),
  banReason: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bannedAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  bannedBy: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  isSuspended: z.lazy(() => SortOrderSchema).optional(),
  suspendedUntil: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  suspensionReason: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastLoginIp: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
}).strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  firstName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  role: z.union([ z.lazy(() => EnumUserRoleWithAggregatesFilterSchema), z.lazy(() => UserRoleSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumUserStatusWithAggregatesFilterSchema), z.lazy(() => UserStatusSchema) ]).optional(),
  isBanned: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  banReason: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  bannedAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  bannedBy: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  isSuspended: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  suspendedUntil: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  suspensionReason: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  lastLoginIp: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const VerificationWhereInputSchema: z.ZodType<Prisma.VerificationWhereInput> = z.object({
  AND: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  hashedIdentifier: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  hashedValue: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const VerificationOrderByWithRelationInputSchema: z.ZodType<Prisma.VerificationOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const VerificationWhereUniqueInputSchema: z.ZodType<Prisma.VerificationWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    hashedIdentifier_hashedValue: z.lazy(() => VerificationHashedIdentifierHashedValueCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    hashedIdentifier_hashedValue: z.lazy(() => VerificationHashedIdentifierHashedValueCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  hashedIdentifier_hashedValue: z.lazy(() => VerificationHashedIdentifierHashedValueCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  hashedIdentifier: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  hashedValue: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict());

export const VerificationOrderByWithAggregationInputSchema: z.ZodType<Prisma.VerificationOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => VerificationCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => VerificationMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => VerificationMinOrderByAggregateInputSchema).optional(),
}).strict();

export const VerificationScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.VerificationScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema), z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema), z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  hashedIdentifier: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  hashedValue: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AccountCreateInputSchema: z.ZodType<Prisma.AccountCreateInput> = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutAccountsInputSchema),
}).strict();

export const AccountUncheckedCreateInputSchema: z.ZodType<Prisma.AccountUncheckedCreateInput> = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AccountUpdateInputSchema: z.ZodType<Prisma.AccountUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutAccountsNestedInputSchema).optional(),
}).strict();

export const AccountUncheckedUpdateInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountCreateManyInputSchema: z.ZodType<Prisma.AccountCreateManyInput> = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AccountUpdateManyMutationInputSchema: z.ZodType<Prisma.AccountUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionCreateInputSchema: z.ZodType<Prisma.AdminPermissionCreateInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutAdminPermissionsInputSchema),
}).strict();

export const AdminPermissionUncheckedCreateInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AdminPermissionUpdateInputSchema: z.ZodType<Prisma.AdminPermissionUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutAdminPermissionsNestedInputSchema).optional(),
}).strict();

export const AdminPermissionUncheckedUpdateInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionCreateManyInputSchema: z.ZodType<Prisma.AdminPermissionCreateManyInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AdminPermissionUpdateManyMutationInputSchema: z.ZodType<Prisma.AdminPermissionUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogCreateInputSchema: z.ZodType<Prisma.AuditLogCreateInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutAuditLogsInputSchema),
}).strict();

export const AuditLogUncheckedCreateInputSchema: z.ZodType<Prisma.AuditLogUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const AuditLogUpdateInputSchema: z.ZodType<Prisma.AuditLogUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutAuditLogsNestedInputSchema).optional(),
}).strict();

export const AuditLogUncheckedUpdateInputSchema: z.ZodType<Prisma.AuditLogUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogCreateManyInputSchema: z.ZodType<Prisma.AuditLogCreateManyInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const AuditLogUpdateManyMutationInputSchema: z.ZodType<Prisma.AuditLogUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AuditLogUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ClientCreateInputSchema: z.ZodType<Prisma.ClientCreateInput> = z.object({
  id: z.string().optional(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutClientInputSchema),
  payments: z.lazy(() => PaymentCreateNestedManyWithoutClientInputSchema).optional(),
}).strict();

export const ClientUncheckedCreateInputSchema: z.ZodType<Prisma.ClientUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  payments: z.lazy(() => PaymentUncheckedCreateNestedManyWithoutClientInputSchema).optional(),
}).strict();

export const ClientUpdateInputSchema: z.ZodType<Prisma.ClientUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutClientNestedInputSchema).optional(),
  payments: z.lazy(() => PaymentUpdateManyWithoutClientNestedInputSchema).optional(),
}).strict();

export const ClientUncheckedUpdateInputSchema: z.ZodType<Prisma.ClientUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  payments: z.lazy(() => PaymentUncheckedUpdateManyWithoutClientNestedInputSchema).optional(),
}).strict();

export const ClientCreateManyInputSchema: z.ZodType<Prisma.ClientCreateManyInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const ClientUpdateManyMutationInputSchema: z.ZodType<Prisma.ClientUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ClientUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ClientUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentCreateInputSchema: z.ZodType<Prisma.DocumentCreateInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  provider: z.lazy(() => ProviderCreateNestedOneWithoutDocumentsInputSchema).optional(),
  createdByUser: z.lazy(() => UserCreateNestedOneWithoutDocumentsInputSchema),
}).strict();

export const DocumentUncheckedCreateInputSchema: z.ZodType<Prisma.DocumentUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  createdBy: z.string(),
}).strict();

export const DocumentUpdateInputSchema: z.ZodType<Prisma.DocumentUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  provider: z.lazy(() => ProviderUpdateOneWithoutDocumentsNestedInputSchema).optional(),
  createdByUser: z.lazy(() => UserUpdateOneRequiredWithoutDocumentsNestedInputSchema).optional(),
}).strict();

export const DocumentUncheckedUpdateInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentCreateManyInputSchema: z.ZodType<Prisma.DocumentCreateManyInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  createdBy: z.string(),
}).strict();

export const DocumentUpdateManyMutationInputSchema: z.ZodType<Prisma.DocumentUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const DocumentUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MediaCreateInputSchema: z.ZodType<Prisma.MediaCreateInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  avatarUser: z.lazy(() => UserCreateNestedOneWithoutAvatarInputSchema).optional(),
  coverUser: z.lazy(() => UserCreateNestedOneWithoutCoverImageInputSchema).optional(),
}).strict();

export const MediaUncheckedCreateInputSchema: z.ZodType<Prisma.MediaUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const MediaUpdateInputSchema: z.ZodType<Prisma.MediaUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUser: z.lazy(() => UserUpdateOneWithoutAvatarNestedInputSchema).optional(),
  coverUser: z.lazy(() => UserUpdateOneWithoutCoverImageNestedInputSchema).optional(),
}).strict();

export const MediaUncheckedUpdateInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MediaCreateManyInputSchema: z.ZodType<Prisma.MediaCreateManyInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const MediaUpdateManyMutationInputSchema: z.ZodType<Prisma.MediaUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MediaUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PaymentCreateInputSchema: z.ZodType<Prisma.PaymentCreateInput> = z.object({
  id: z.string().optional(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutPaymentsInputSchema),
}).strict();

export const PaymentUncheckedCreateInputSchema: z.ZodType<Prisma.PaymentUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const PaymentUpdateInputSchema: z.ZodType<Prisma.PaymentUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  client: z.lazy(() => ClientUpdateOneRequiredWithoutPaymentsNestedInputSchema).optional(),
}).strict();

export const PaymentUncheckedUpdateInputSchema: z.ZodType<Prisma.PaymentUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PaymentCreateManyInputSchema: z.ZodType<Prisma.PaymentCreateManyInput> = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const PaymentUpdateManyMutationInputSchema: z.ZodType<Prisma.PaymentUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PaymentUncheckedUpdateManyInputSchema: z.ZodType<Prisma.PaymentUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProviderCreateInputSchema: z.ZodType<Prisma.ProviderCreateInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  siret: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutProviderInputSchema).optional(),
}).strict();

export const ProviderUncheckedCreateInputSchema: z.ZodType<Prisma.ProviderUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  siret: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutProviderInputSchema).optional(),
}).strict();

export const ProviderUpdateInputSchema: z.ZodType<Prisma.ProviderUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutProviderNestedInputSchema).optional(),
}).strict();

export const ProviderUncheckedUpdateInputSchema: z.ZodType<Prisma.ProviderUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutProviderNestedInputSchema).optional(),
}).strict();

export const ProviderCreateManyInputSchema: z.ZodType<Prisma.ProviderCreateManyInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  siret: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const ProviderUpdateManyMutationInputSchema: z.ZodType<Prisma.ProviderUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProviderUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ProviderUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionCreateInputSchema: z.ZodType<Prisma.SessionCreateInput> = z.object({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutSessionsInputSchema),
}).strict();

export const SessionUncheckedCreateInputSchema: z.ZodType<Prisma.SessionUncheckedCreateInput> = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SessionUpdateInputSchema: z.ZodType<Prisma.SessionUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutSessionsNestedInputSchema).optional(),
}).strict();

export const SessionUncheckedUpdateInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionCreateManyInputSchema: z.ZodType<Prisma.SessionCreateManyInput> = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SessionUpdateManyMutationInputSchema: z.ZodType<Prisma.SessionUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SettingsCreateInputSchema: z.ZodType<Prisma.SettingsCreateInput> = z.object({
  id: z.string().optional(),
  companyName: z.string().optional().nullable(),
  companyLegal: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyCity: z.string().optional().nullable(),
  companyCountry: z.string().optional(),
  companySiret: z.string().optional().nullable(),
  companyEmail: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SettingsUncheckedCreateInputSchema: z.ZodType<Prisma.SettingsUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  companyName: z.string().optional().nullable(),
  companyLegal: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyCity: z.string().optional().nullable(),
  companyCountry: z.string().optional(),
  companySiret: z.string().optional().nullable(),
  companyEmail: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SettingsUpdateInputSchema: z.ZodType<Prisma.SettingsUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companySiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SettingsUncheckedUpdateInputSchema: z.ZodType<Prisma.SettingsUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companySiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SettingsCreateManyInputSchema: z.ZodType<Prisma.SettingsCreateManyInput> = z.object({
  id: z.string().optional(),
  companyName: z.string().optional().nullable(),
  companyLegal: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyCity: z.string().optional().nullable(),
  companyCountry: z.string().optional(),
  companySiret: z.string().optional().nullable(),
  companyEmail: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SettingsUpdateManyMutationInputSchema: z.ZodType<Prisma.SettingsUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companySiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SettingsUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SettingsUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companySiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  companyPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationCreateInputSchema: z.ZodType<Prisma.VerificationCreateInput> = z.object({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const VerificationUncheckedCreateInputSchema: z.ZodType<Prisma.VerificationUncheckedCreateInput> = z.object({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const VerificationUpdateInputSchema: z.ZodType<Prisma.VerificationUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationUncheckedUpdateInputSchema: z.ZodType<Prisma.VerificationUncheckedUpdateInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationCreateManyInputSchema: z.ZodType<Prisma.VerificationCreateManyInput> = z.object({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const VerificationUpdateManyMutationInputSchema: z.ZodType<Prisma.VerificationUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationUncheckedUpdateManyInputSchema: z.ZodType<Prisma.VerificationUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const UserScalarRelationFilterSchema: z.ZodType<Prisma.UserScalarRelationFilter> = z.object({
  is: z.lazy(() => UserWhereInputSchema).optional(),
  isNot: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional(),
}).strict();

export const AccountProviderIdAccountIdCompoundUniqueInputSchema: z.ZodType<Prisma.AccountProviderIdAccountIdCompoundUniqueInput> = z.object({
  providerId: z.string(),
  accountId: z.string(),
}).strict();

export const AccountCountOrderByAggregateInputSchema: z.ZodType<Prisma.AccountCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  accountId: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  accessToken: z.lazy(() => SortOrderSchema).optional(),
  refreshToken: z.lazy(() => SortOrderSchema).optional(),
  accessTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  refreshTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  idToken: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AccountMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  accountId: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  accessToken: z.lazy(() => SortOrderSchema).optional(),
  refreshToken: z.lazy(() => SortOrderSchema).optional(),
  accessTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  refreshTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  idToken: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AccountMinOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  accountId: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  accessToken: z.lazy(() => SortOrderSchema).optional(),
  refreshToken: z.lazy(() => SortOrderSchema).optional(),
  accessTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  refreshTokenExpiresAt: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  idToken: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional(),
}).strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
}).strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
}).strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
}).strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const AdminPermissionUserIdEntityCompoundUniqueInputSchema: z.ZodType<Prisma.AdminPermissionUserIdEntityCompoundUniqueInput> = z.object({
  userId: z.string(),
  entity: z.string(),
}).strict();

export const AdminPermissionCountOrderByAggregateInputSchema: z.ZodType<Prisma.AdminPermissionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  canCreate: z.lazy(() => SortOrderSchema).optional(),
  canRead: z.lazy(() => SortOrderSchema).optional(),
  canUpdate: z.lazy(() => SortOrderSchema).optional(),
  canDelete: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AdminPermissionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AdminPermissionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  canCreate: z.lazy(() => SortOrderSchema).optional(),
  canRead: z.lazy(() => SortOrderSchema).optional(),
  canUpdate: z.lazy(() => SortOrderSchema).optional(),
  canDelete: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AdminPermissionMinOrderByAggregateInputSchema: z.ZodType<Prisma.AdminPermissionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  canCreate: z.lazy(() => SortOrderSchema).optional(),
  canRead: z.lazy(() => SortOrderSchema).optional(),
  canUpdate: z.lazy(() => SortOrderSchema).optional(),
  canDelete: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
}).strict();

export const EnumAuditActionFilterSchema: z.ZodType<Prisma.EnumAuditActionFilter> = z.object({
  equals: z.lazy(() => AuditActionSchema).optional(),
  in: z.lazy(() => AuditActionSchema).array().optional(),
  notIn: z.lazy(() => AuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => NestedEnumAuditActionFilterSchema) ]).optional(),
}).strict();

export const JsonNullableFilterSchema: z.ZodType<Prisma.JsonNullableFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
}).strict();

export const AuditLogCountOrderByAggregateInputSchema: z.ZodType<Prisma.AuditLogCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  entityId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  changes: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AuditLogMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AuditLogMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  entityId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AuditLogMinOrderByAggregateInputSchema: z.ZodType<Prisma.AuditLogMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  entity: z.lazy(() => SortOrderSchema).optional(),
  entityId: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumAuditActionWithAggregatesFilterSchema: z.ZodType<Prisma.EnumAuditActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => AuditActionSchema).optional(),
  in: z.lazy(() => AuditActionSchema).array().optional(),
  notIn: z.lazy(() => AuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => NestedEnumAuditActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumAuditActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumAuditActionFilterSchema).optional(),
}).strict();

export const JsonNullableWithAggregatesFilterSchema: z.ZodType<Prisma.JsonNullableWithAggregatesFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedJsonNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedJsonNullableFilterSchema).optional(),
}).strict();

export const PaymentListRelationFilterSchema: z.ZodType<Prisma.PaymentListRelationFilter> = z.object({
  every: z.lazy(() => PaymentWhereInputSchema).optional(),
  some: z.lazy(() => PaymentWhereInputSchema).optional(),
  none: z.lazy(() => PaymentWhereInputSchema).optional(),
}).strict();

export const PaymentOrderByRelationAggregateInputSchema: z.ZodType<Prisma.PaymentOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ClientCountOrderByAggregateInputSchema: z.ZodType<Prisma.ClientCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  billingAddress: z.lazy(() => SortOrderSchema).optional(),
  billingCity: z.lazy(() => SortOrderSchema).optional(),
  billingCountry: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ClientMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ClientMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  billingAddress: z.lazy(() => SortOrderSchema).optional(),
  billingCity: z.lazy(() => SortOrderSchema).optional(),
  billingCountry: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ClientMinOrderByAggregateInputSchema: z.ZodType<Prisma.ClientMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  billingAddress: z.lazy(() => SortOrderSchema).optional(),
  billingCity: z.lazy(() => SortOrderSchema).optional(),
  billingCountry: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JsonFilterSchema: z.ZodType<Prisma.JsonFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
}).strict();

export const DecimalFilterSchema: z.ZodType<Prisma.DecimalFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalFilterSchema) ]).optional(),
}).strict();

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const DecimalNullableFilterSchema: z.ZodType<Prisma.DecimalNullableFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const IntNullableFilterSchema: z.ZodType<Prisma.IntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const ProviderNullableScalarRelationFilterSchema: z.ZodType<Prisma.ProviderNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => ProviderWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => ProviderWhereInputSchema).optional().nullable(),
}).strict();

export const DocumentCountOrderByAggregateInputSchema: z.ZodType<Prisma.DocumentCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  invoiceNumber: z.lazy(() => SortOrderSchema).optional(),
  quoteNumber: z.lazy(() => SortOrderSchema).optional(),
  contractRef: z.lazy(() => SortOrderSchema).optional(),
  clientName: z.lazy(() => SortOrderSchema).optional(),
  clientSiret: z.lazy(() => SortOrderSchema).optional(),
  clientAddress: z.lazy(() => SortOrderSchema).optional(),
  clientCity: z.lazy(() => SortOrderSchema).optional(),
  clientCountry: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  providerName: z.lazy(() => SortOrderSchema).optional(),
  providerLegal: z.lazy(() => SortOrderSchema).optional(),
  providerSiret: z.lazy(() => SortOrderSchema).optional(),
  providerAddress: z.lazy(() => SortOrderSchema).optional(),
  providerCity: z.lazy(() => SortOrderSchema).optional(),
  providerEmail: z.lazy(() => SortOrderSchema).optional(),
  providerPhone: z.lazy(() => SortOrderSchema).optional(),
  items: z.lazy(() => SortOrderSchema).optional(),
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.lazy(() => SortOrderSchema).optional(),
  pdfUrl: z.lazy(() => SortOrderSchema).optional(),
  fileSize: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DocumentAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DocumentAvgOrderByAggregateInput> = z.object({
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.lazy(() => SortOrderSchema).optional(),
  fileSize: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DocumentMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DocumentMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  invoiceNumber: z.lazy(() => SortOrderSchema).optional(),
  quoteNumber: z.lazy(() => SortOrderSchema).optional(),
  contractRef: z.lazy(() => SortOrderSchema).optional(),
  clientName: z.lazy(() => SortOrderSchema).optional(),
  clientSiret: z.lazy(() => SortOrderSchema).optional(),
  clientAddress: z.lazy(() => SortOrderSchema).optional(),
  clientCity: z.lazy(() => SortOrderSchema).optional(),
  clientCountry: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  providerName: z.lazy(() => SortOrderSchema).optional(),
  providerLegal: z.lazy(() => SortOrderSchema).optional(),
  providerSiret: z.lazy(() => SortOrderSchema).optional(),
  providerAddress: z.lazy(() => SortOrderSchema).optional(),
  providerCity: z.lazy(() => SortOrderSchema).optional(),
  providerEmail: z.lazy(() => SortOrderSchema).optional(),
  providerPhone: z.lazy(() => SortOrderSchema).optional(),
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.lazy(() => SortOrderSchema).optional(),
  pdfUrl: z.lazy(() => SortOrderSchema).optional(),
  fileSize: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DocumentMinOrderByAggregateInputSchema: z.ZodType<Prisma.DocumentMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  invoiceNumber: z.lazy(() => SortOrderSchema).optional(),
  quoteNumber: z.lazy(() => SortOrderSchema).optional(),
  contractRef: z.lazy(() => SortOrderSchema).optional(),
  clientName: z.lazy(() => SortOrderSchema).optional(),
  clientSiret: z.lazy(() => SortOrderSchema).optional(),
  clientAddress: z.lazy(() => SortOrderSchema).optional(),
  clientCity: z.lazy(() => SortOrderSchema).optional(),
  clientCountry: z.lazy(() => SortOrderSchema).optional(),
  providerId: z.lazy(() => SortOrderSchema).optional(),
  providerName: z.lazy(() => SortOrderSchema).optional(),
  providerLegal: z.lazy(() => SortOrderSchema).optional(),
  providerSiret: z.lazy(() => SortOrderSchema).optional(),
  providerAddress: z.lazy(() => SortOrderSchema).optional(),
  providerCity: z.lazy(() => SortOrderSchema).optional(),
  providerEmail: z.lazy(() => SortOrderSchema).optional(),
  providerPhone: z.lazy(() => SortOrderSchema).optional(),
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.lazy(() => SortOrderSchema).optional(),
  pdfUrl: z.lazy(() => SortOrderSchema).optional(),
  fileSize: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const DocumentSumOrderByAggregateInputSchema: z.ZodType<Prisma.DocumentSumOrderByAggregateInput> = z.object({
  subtotal: z.lazy(() => SortOrderSchema).optional(),
  tva: z.lazy(() => SortOrderSchema).optional(),
  total: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  railwayEstimate: z.lazy(() => SortOrderSchema).optional(),
  fileSize: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const JsonWithAggregatesFilterSchema: z.ZodType<Prisma.JsonWithAggregatesFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedJsonFilterSchema).optional(),
  _max: z.lazy(() => NestedJsonFilterSchema).optional(),
}).strict();

export const DecimalWithAggregatesFilterSchema: z.ZodType<Prisma.DecimalWithAggregatesFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _sum: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _min: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _max: z.lazy(() => NestedDecimalFilterSchema).optional(),
}).strict();

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional(),
}).strict();

export const DecimalNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DecimalNullableWithAggregatesFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
}).strict();

export const IntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.IntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional(),
}).strict();

export const UserNullableScalarRelationFilterSchema: z.ZodType<Prisma.UserNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => UserWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => UserWhereInputSchema).optional().nullable(),
}).strict();

export const MediaCountOrderByAggregateInputSchema: z.ZodType<Prisma.MediaCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const MediaAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MediaAvgOrderByAggregateInput> = z.object({
  size: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const MediaMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MediaMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const MediaMinOrderByAggregateInputSchema: z.ZodType<Prisma.MediaMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const MediaSumOrderByAggregateInputSchema: z.ZodType<Prisma.MediaSumOrderByAggregateInput> = z.object({
  size: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumPaymentStatusFilterSchema: z.ZodType<Prisma.EnumPaymentStatusFilter> = z.object({
  equals: z.lazy(() => PaymentStatusSchema).optional(),
  in: z.lazy(() => PaymentStatusSchema).array().optional(),
  notIn: z.lazy(() => PaymentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => NestedEnumPaymentStatusFilterSchema) ]).optional(),
}).strict();

export const EnumPaymentFrequencyFilterSchema: z.ZodType<Prisma.EnumPaymentFrequencyFilter> = z.object({
  equals: z.lazy(() => PaymentFrequencySchema).optional(),
  in: z.lazy(() => PaymentFrequencySchema).array().optional(),
  notIn: z.lazy(() => PaymentFrequencySchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => NestedEnumPaymentFrequencyFilterSchema) ]).optional(),
}).strict();

export const StringNullableListFilterSchema: z.ZodType<Prisma.StringNullableListFilter> = z.object({
  equals: z.string().array().optional().nullable(),
  has: z.string().optional().nullable(),
  hasEvery: z.string().array().optional(),
  hasSome: z.string().array().optional(),
  isEmpty: z.boolean().optional(),
}).strict();

export const ClientScalarRelationFilterSchema: z.ZodType<Prisma.ClientScalarRelationFilter> = z.object({
  is: z.lazy(() => ClientWhereInputSchema).optional(),
  isNot: z.lazy(() => ClientWhereInputSchema).optional(),
}).strict();

export const PaymentCountOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  clientId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  frequency: z.lazy(() => SortOrderSchema).optional(),
  dueDate: z.lazy(() => SortOrderSchema).optional(),
  paidAt: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentIntentId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  attachedFiles: z.lazy(() => SortOrderSchema).optional(),
  receiptUrl: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const PaymentAvgOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentAvgOrderByAggregateInput> = z.object({
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const PaymentMaxOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  clientId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  frequency: z.lazy(() => SortOrderSchema).optional(),
  dueDate: z.lazy(() => SortOrderSchema).optional(),
  paidAt: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentIntentId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  receiptUrl: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const PaymentMinOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  clientId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  frequency: z.lazy(() => SortOrderSchema).optional(),
  dueDate: z.lazy(() => SortOrderSchema).optional(),
  paidAt: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentIntentId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  receiptUrl: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const PaymentSumOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentSumOrderByAggregateInput> = z.object({
  amount: z.lazy(() => SortOrderSchema).optional(),
  stripeFee: z.lazy(() => SortOrderSchema).optional(),
  totalWithFees: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumPaymentStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumPaymentStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PaymentStatusSchema).optional(),
  in: z.lazy(() => PaymentStatusSchema).array().optional(),
  notIn: z.lazy(() => PaymentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => NestedEnumPaymentStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPaymentStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPaymentStatusFilterSchema).optional(),
}).strict();

export const EnumPaymentFrequencyWithAggregatesFilterSchema: z.ZodType<Prisma.EnumPaymentFrequencyWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PaymentFrequencySchema).optional(),
  in: z.lazy(() => PaymentFrequencySchema).array().optional(),
  notIn: z.lazy(() => PaymentFrequencySchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => NestedEnumPaymentFrequencyWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPaymentFrequencyFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPaymentFrequencyFilterSchema).optional(),
}).strict();

export const DocumentListRelationFilterSchema: z.ZodType<Prisma.DocumentListRelationFilter> = z.object({
  every: z.lazy(() => DocumentWhereInputSchema).optional(),
  some: z.lazy(() => DocumentWhereInputSchema).optional(),
  none: z.lazy(() => DocumentWhereInputSchema).optional(),
}).strict();

export const DocumentOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DocumentOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ProviderCountOrderByAggregateInputSchema: z.ZodType<Prisma.ProviderCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  legalName: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  city: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ProviderAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ProviderAvgOrderByAggregateInput> = z.object({
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ProviderMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ProviderMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  legalName: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  city: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ProviderMinOrderByAggregateInputSchema: z.ZodType<Prisma.ProviderMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  legalName: z.lazy(() => SortOrderSchema).optional(),
  address: z.lazy(() => SortOrderSchema).optional(),
  city: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  siret: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const ProviderSumOrderByAggregateInputSchema: z.ZodType<Prisma.ProviderSumOrderByAggregateInput> = z.object({
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SessionCountOrderByAggregateInputSchema: z.ZodType<Prisma.SessionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SessionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SessionMinOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsCountOrderByAggregateInputSchema: z.ZodType<Prisma.SettingsCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  companyLegal: z.lazy(() => SortOrderSchema).optional(),
  companyAddress: z.lazy(() => SortOrderSchema).optional(),
  companyCity: z.lazy(() => SortOrderSchema).optional(),
  companyCountry: z.lazy(() => SortOrderSchema).optional(),
  companySiret: z.lazy(() => SortOrderSchema).optional(),
  companyEmail: z.lazy(() => SortOrderSchema).optional(),
  companyPhone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsAvgOrderByAggregateInputSchema: z.ZodType<Prisma.SettingsAvgOrderByAggregateInput> = z.object({
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SettingsMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  companyLegal: z.lazy(() => SortOrderSchema).optional(),
  companyAddress: z.lazy(() => SortOrderSchema).optional(),
  companyCity: z.lazy(() => SortOrderSchema).optional(),
  companyCountry: z.lazy(() => SortOrderSchema).optional(),
  companySiret: z.lazy(() => SortOrderSchema).optional(),
  companyEmail: z.lazy(() => SortOrderSchema).optional(),
  companyPhone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsMinOrderByAggregateInputSchema: z.ZodType<Prisma.SettingsMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  companyName: z.lazy(() => SortOrderSchema).optional(),
  companyLegal: z.lazy(() => SortOrderSchema).optional(),
  companyAddress: z.lazy(() => SortOrderSchema).optional(),
  companyCity: z.lazy(() => SortOrderSchema).optional(),
  companyCountry: z.lazy(() => SortOrderSchema).optional(),
  companySiret: z.lazy(() => SortOrderSchema).optional(),
  companyEmail: z.lazy(() => SortOrderSchema).optional(),
  companyPhone: z.lazy(() => SortOrderSchema).optional(),
  bankName: z.lazy(() => SortOrderSchema).optional(),
  iban: z.lazy(() => SortOrderSchema).optional(),
  bic: z.lazy(() => SortOrderSchema).optional(),
  logoUrl: z.lazy(() => SortOrderSchema).optional(),
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const SettingsSumOrderByAggregateInputSchema: z.ZodType<Prisma.SettingsSumOrderByAggregateInput> = z.object({
  tvaRate: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumUserRoleFilterSchema: z.ZodType<Prisma.EnumUserRoleFilter> = z.object({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleFilterSchema) ]).optional(),
}).strict();

export const EnumUserStatusFilterSchema: z.ZodType<Prisma.EnumUserStatusFilter> = z.object({
  equals: z.lazy(() => UserStatusSchema).optional(),
  in: z.lazy(() => UserStatusSchema).array().optional(),
  notIn: z.lazy(() => UserStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => NestedEnumUserStatusFilterSchema) ]).optional(),
}).strict();

export const MediaNullableScalarRelationFilterSchema: z.ZodType<Prisma.MediaNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => MediaWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => MediaWhereInputSchema).optional().nullable(),
}).strict();

export const SessionListRelationFilterSchema: z.ZodType<Prisma.SessionListRelationFilter> = z.object({
  every: z.lazy(() => SessionWhereInputSchema).optional(),
  some: z.lazy(() => SessionWhereInputSchema).optional(),
  none: z.lazy(() => SessionWhereInputSchema).optional(),
}).strict();

export const AccountListRelationFilterSchema: z.ZodType<Prisma.AccountListRelationFilter> = z.object({
  every: z.lazy(() => AccountWhereInputSchema).optional(),
  some: z.lazy(() => AccountWhereInputSchema).optional(),
  none: z.lazy(() => AccountWhereInputSchema).optional(),
}).strict();

export const AuditLogListRelationFilterSchema: z.ZodType<Prisma.AuditLogListRelationFilter> = z.object({
  every: z.lazy(() => AuditLogWhereInputSchema).optional(),
  some: z.lazy(() => AuditLogWhereInputSchema).optional(),
  none: z.lazy(() => AuditLogWhereInputSchema).optional(),
}).strict();

export const AdminPermissionListRelationFilterSchema: z.ZodType<Prisma.AdminPermissionListRelationFilter> = z.object({
  every: z.lazy(() => AdminPermissionWhereInputSchema).optional(),
  some: z.lazy(() => AdminPermissionWhereInputSchema).optional(),
  none: z.lazy(() => AdminPermissionWhereInputSchema).optional(),
}).strict();

export const ClientNullableScalarRelationFilterSchema: z.ZodType<Prisma.ClientNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => ClientWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => ClientWhereInputSchema).optional().nullable(),
}).strict();

export const SessionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.SessionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AccountOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AccountOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AuditLogOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AuditLogOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const AdminPermissionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AdminPermissionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  isBanned: z.lazy(() => SortOrderSchema).optional(),
  banReason: z.lazy(() => SortOrderSchema).optional(),
  bannedAt: z.lazy(() => SortOrderSchema).optional(),
  bannedBy: z.lazy(() => SortOrderSchema).optional(),
  isSuspended: z.lazy(() => SortOrderSchema).optional(),
  suspendedUntil: z.lazy(() => SortOrderSchema).optional(),
  suspensionReason: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginIp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  isBanned: z.lazy(() => SortOrderSchema).optional(),
  banReason: z.lazy(() => SortOrderSchema).optional(),
  bannedAt: z.lazy(() => SortOrderSchema).optional(),
  bannedBy: z.lazy(() => SortOrderSchema).optional(),
  isSuspended: z.lazy(() => SortOrderSchema).optional(),
  suspendedUntil: z.lazy(() => SortOrderSchema).optional(),
  suspensionReason: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginIp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  isBanned: z.lazy(() => SortOrderSchema).optional(),
  banReason: z.lazy(() => SortOrderSchema).optional(),
  bannedAt: z.lazy(() => SortOrderSchema).optional(),
  bannedBy: z.lazy(() => SortOrderSchema).optional(),
  isSuspended: z.lazy(() => SortOrderSchema).optional(),
  suspendedUntil: z.lazy(() => SortOrderSchema).optional(),
  suspensionReason: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginIp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const EnumUserRoleWithAggregatesFilterSchema: z.ZodType<Prisma.EnumUserRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
}).strict();

export const EnumUserStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumUserStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => UserStatusSchema).optional(),
  in: z.lazy(() => UserStatusSchema).array().optional(),
  notIn: z.lazy(() => UserStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => NestedEnumUserStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserStatusFilterSchema).optional(),
}).strict();

export const VerificationHashedIdentifierHashedValueCompoundUniqueInputSchema: z.ZodType<Prisma.VerificationHashedIdentifierHashedValueCompoundUniqueInput> = z.object({
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
}).strict();

export const VerificationCountOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const VerificationMaxOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const VerificationMinOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
}).strict();

export const UserCreateNestedOneWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAccountsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional(),
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable(),
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable(),
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional(),
}).strict();

export const UserUpdateOneRequiredWithoutAccountsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAccountsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAccountsInputSchema), z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAdminPermissionsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAdminPermissionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAdminPermissionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional(),
}).strict();

export const UserUpdateOneRequiredWithoutAdminPermissionsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAdminPermissionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAdminPermissionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAdminPermissionsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAdminPermissionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAdminPermissionsInputSchema), z.lazy(() => UserUpdateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAdminPermissionsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAuditLogsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAuditLogsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAuditLogsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const EnumAuditActionFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumAuditActionFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => AuditActionSchema).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutAuditLogsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAuditLogsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAuditLogsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAuditLogsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAuditLogsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAuditLogsInputSchema), z.lazy(() => UserUpdateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAuditLogsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutClientInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutClientInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutClientInputSchema), z.lazy(() => UserUncheckedCreateWithoutClientInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutClientInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const PaymentCreateNestedManyWithoutClientInputSchema: z.ZodType<Prisma.PaymentCreateNestedManyWithoutClientInput> = z.object({
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentCreateWithoutClientInputSchema).array(), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema), z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentCreateManyClientInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const PaymentUncheckedCreateNestedManyWithoutClientInputSchema: z.ZodType<Prisma.PaymentUncheckedCreateNestedManyWithoutClientInput> = z.object({
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentCreateWithoutClientInputSchema).array(), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema), z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentCreateManyClientInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutClientNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutClientNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutClientInputSchema), z.lazy(() => UserUncheckedCreateWithoutClientInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutClientInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutClientInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutClientInputSchema), z.lazy(() => UserUpdateWithoutClientInputSchema), z.lazy(() => UserUncheckedUpdateWithoutClientInputSchema) ]).optional(),
}).strict();

export const PaymentUpdateManyWithoutClientNestedInputSchema: z.ZodType<Prisma.PaymentUpdateManyWithoutClientNestedInput> = z.object({
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentCreateWithoutClientInputSchema).array(), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema), z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PaymentUpsertWithWhereUniqueWithoutClientInputSchema), z.lazy(() => PaymentUpsertWithWhereUniqueWithoutClientInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentCreateManyClientInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PaymentUpdateWithWhereUniqueWithoutClientInputSchema), z.lazy(() => PaymentUpdateWithWhereUniqueWithoutClientInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PaymentUpdateManyWithWhereWithoutClientInputSchema), z.lazy(() => PaymentUpdateManyWithWhereWithoutClientInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PaymentScalarWhereInputSchema), z.lazy(() => PaymentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const PaymentUncheckedUpdateManyWithoutClientNestedInputSchema: z.ZodType<Prisma.PaymentUncheckedUpdateManyWithoutClientNestedInput> = z.object({
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentCreateWithoutClientInputSchema).array(), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema), z.lazy(() => PaymentCreateOrConnectWithoutClientInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PaymentUpsertWithWhereUniqueWithoutClientInputSchema), z.lazy(() => PaymentUpsertWithWhereUniqueWithoutClientInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentCreateManyClientInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PaymentWhereUniqueInputSchema), z.lazy(() => PaymentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PaymentUpdateWithWhereUniqueWithoutClientInputSchema), z.lazy(() => PaymentUpdateWithWhereUniqueWithoutClientInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PaymentUpdateManyWithWhereWithoutClientInputSchema), z.lazy(() => PaymentUpdateManyWithWhereWithoutClientInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PaymentScalarWhereInputSchema), z.lazy(() => PaymentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProviderCreateNestedOneWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderCreateNestedOneWithoutDocumentsInput> = z.object({
  create: z.union([ z.lazy(() => ProviderCreateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedCreateWithoutDocumentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProviderCreateOrConnectWithoutDocumentsInputSchema).optional(),
  connect: z.lazy(() => ProviderWhereUniqueInputSchema).optional(),
}).strict();

export const UserCreateNestedOneWithoutDocumentsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutDocumentsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocumentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocumentsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const DecimalFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DecimalFieldUpdateOperationsInput> = z.object({
  set: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  increment: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  decrement: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  multiply: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  divide: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
}).strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional(),
}).strict();

export const NullableDecimalFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDecimalFieldUpdateOperationsInput> = z.object({
  set: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  increment: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  decrement: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  multiply: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  divide: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
}).strict();

export const NullableIntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableIntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional(),
}).strict();

export const ProviderUpdateOneWithoutDocumentsNestedInputSchema: z.ZodType<Prisma.ProviderUpdateOneWithoutDocumentsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProviderCreateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedCreateWithoutDocumentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProviderCreateOrConnectWithoutDocumentsInputSchema).optional(),
  upsert: z.lazy(() => ProviderUpsertWithoutDocumentsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ProviderWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ProviderWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ProviderWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProviderUpdateToOneWithWhereWithoutDocumentsInputSchema), z.lazy(() => ProviderUpdateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedUpdateWithoutDocumentsInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutDocumentsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutDocumentsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocumentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocumentsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutDocumentsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutDocumentsInputSchema), z.lazy(() => UserUpdateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocumentsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAvatarInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAvatarInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const UserCreateNestedOneWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutCoverImageInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutCoverImageInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const UserUpdateOneWithoutAvatarNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutAvatarNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAvatarInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAvatarInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAvatarInputSchema), z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneWithoutCoverImageNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutCoverImageNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutCoverImageInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutCoverImageInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutCoverImageInputSchema), z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]).optional(),
}).strict();

export const PaymentCreateattachedFilesInputSchema: z.ZodType<Prisma.PaymentCreateattachedFilesInput> = z.object({
  set: z.string().array(),
}).strict();

export const ClientCreateNestedOneWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientCreateNestedOneWithoutPaymentsInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedCreateWithoutPaymentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutPaymentsInputSchema).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
}).strict();

export const EnumPaymentStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumPaymentStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => PaymentStatusSchema).optional(),
}).strict();

export const EnumPaymentFrequencyFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumPaymentFrequencyFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => PaymentFrequencySchema).optional(),
}).strict();

export const PaymentUpdateattachedFilesInputSchema: z.ZodType<Prisma.PaymentUpdateattachedFilesInput> = z.object({
  set: z.string().array().optional(),
  push: z.union([ z.string(),z.string().array() ]).optional(),
}).strict();

export const ClientUpdateOneRequiredWithoutPaymentsNestedInputSchema: z.ZodType<Prisma.ClientUpdateOneRequiredWithoutPaymentsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedCreateWithoutPaymentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutPaymentsInputSchema).optional(),
  upsert: z.lazy(() => ClientUpsertWithoutPaymentsInputSchema).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ClientUpdateToOneWithWhereWithoutPaymentsInputSchema), z.lazy(() => ClientUpdateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutPaymentsInputSchema) ]).optional(),
}).strict();

export const DocumentCreateNestedManyWithoutProviderInputSchema: z.ZodType<Prisma.DocumentCreateNestedManyWithoutProviderInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentCreateWithoutProviderInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyProviderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DocumentUncheckedCreateNestedManyWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUncheckedCreateNestedManyWithoutProviderInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentCreateWithoutProviderInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyProviderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DocumentUpdateManyWithoutProviderNestedInputSchema: z.ZodType<Prisma.DocumentUpdateManyWithoutProviderNestedInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentCreateWithoutProviderInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DocumentUpsertWithWhereUniqueWithoutProviderInputSchema), z.lazy(() => DocumentUpsertWithWhereUniqueWithoutProviderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyProviderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DocumentUpdateWithWhereUniqueWithoutProviderInputSchema), z.lazy(() => DocumentUpdateWithWhereUniqueWithoutProviderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DocumentUpdateManyWithWhereWithoutProviderInputSchema), z.lazy(() => DocumentUpdateManyWithWhereWithoutProviderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DocumentUncheckedUpdateManyWithoutProviderNestedInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateManyWithoutProviderNestedInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentCreateWithoutProviderInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutProviderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DocumentUpsertWithWhereUniqueWithoutProviderInputSchema), z.lazy(() => DocumentUpsertWithWhereUniqueWithoutProviderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyProviderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DocumentUpdateWithWhereUniqueWithoutProviderInputSchema), z.lazy(() => DocumentUpdateWithWhereUniqueWithoutProviderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DocumentUpdateManyWithWhereWithoutProviderInputSchema), z.lazy(() => DocumentUpdateManyWithWhereWithoutProviderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutSessionsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutSessionsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutSessionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutSessionsInputSchema), z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]).optional(),
}).strict();

export const MediaCreateNestedOneWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateNestedOneWithoutAvatarUserInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
}).strict();

export const MediaCreateNestedOneWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateNestedOneWithoutCoverUserInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
}).strict();

export const SessionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AccountCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AuditLogCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AuditLogCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogCreateWithoutUserInputSchema).array(), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema), z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AuditLogCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AdminPermissionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateWithoutUserInputSchema).array(), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AdminPermissionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ClientCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.ClientCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
}).strict();

export const DocumentCreateNestedManyWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentCreateNestedManyWithoutCreatedByUserInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyCreatedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateNestedOneWithoutAvatarUserInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
}).strict();

export const MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateNestedOneWithoutCoverUserInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
}).strict();

export const SessionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AccountUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AuditLogUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogCreateWithoutUserInputSchema).array(), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema), z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AuditLogCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateWithoutUserInputSchema).array(), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AdminPermissionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ClientUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.ClientUncheckedCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
}).strict();

export const DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUncheckedCreateNestedManyWithoutCreatedByUserInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyCreatedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const EnumUserRoleFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumUserRoleFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => UserRoleSchema).optional(),
}).strict();

export const EnumUserStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumUserStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => UserStatusSchema).optional(),
}).strict();

export const MediaUpdateOneWithoutAvatarUserNestedInputSchema: z.ZodType<Prisma.MediaUpdateOneWithoutAvatarUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutAvatarUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema), z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]).optional(),
}).strict();

export const MediaUpdateOneWithoutCoverUserNestedInputSchema: z.ZodType<Prisma.MediaUpdateOneWithoutCoverUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutCoverUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutCoverUserInputSchema), z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]).optional(),
}).strict();

export const SessionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => SessionScalarWhereInputSchema), z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AccountUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AccountScalarWhereInputSchema), z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AuditLogUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AuditLogUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogCreateWithoutUserInputSchema).array(), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema), z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AuditLogUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AuditLogUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AuditLogCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AuditLogUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AuditLogUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AuditLogUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AuditLogUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AuditLogScalarWhereInputSchema), z.lazy(() => AuditLogScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AdminPermissionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AdminPermissionUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateWithoutUserInputSchema).array(), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AdminPermissionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AdminPermissionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AdminPermissionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AdminPermissionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AdminPermissionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AdminPermissionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AdminPermissionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AdminPermissionScalarWhereInputSchema), z.lazy(() => AdminPermissionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ClientUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.ClientUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => ClientUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ClientWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ClientWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ClientUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => ClientUpdateWithoutUserInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const DocumentUpdateManyWithoutCreatedByUserNestedInputSchema: z.ZodType<Prisma.DocumentUpdateManyWithoutCreatedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DocumentUpsertWithWhereUniqueWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpsertWithWhereUniqueWithoutCreatedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyCreatedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DocumentUpdateWithWhereUniqueWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpdateWithWhereUniqueWithoutCreatedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DocumentUpdateManyWithWhereWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpdateManyWithWhereWithoutCreatedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateOneWithoutAvatarUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutAvatarUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema), z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]).optional(),
}).strict();

export const MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateOneWithoutCoverUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutCoverUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutCoverUserInputSchema), z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => SessionScalarWhereInputSchema), z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AccountScalarWhereInputSchema), z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AuditLogUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogCreateWithoutUserInputSchema).array(), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema), z.lazy(() => AuditLogCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AuditLogUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AuditLogUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AuditLogCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AuditLogWhereUniqueInputSchema), z.lazy(() => AuditLogWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AuditLogUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AuditLogUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AuditLogUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AuditLogUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AuditLogScalarWhereInputSchema), z.lazy(() => AuditLogScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateWithoutUserInputSchema).array(), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema), z.lazy(() => AdminPermissionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AdminPermissionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AdminPermissionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AdminPermissionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AdminPermissionWhereUniqueInputSchema), z.lazy(() => AdminPermissionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AdminPermissionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => AdminPermissionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AdminPermissionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => AdminPermissionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AdminPermissionScalarWhereInputSchema), z.lazy(() => AdminPermissionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ClientUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.ClientUncheckedUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ClientCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => ClientUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ClientWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ClientWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ClientWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ClientUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => ClientUpdateWithoutUserInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema).array(), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema), z.lazy(() => DocumentCreateOrConnectWithoutCreatedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => DocumentUpsertWithWhereUniqueWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpsertWithWhereUniqueWithoutCreatedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => DocumentCreateManyCreatedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => DocumentWhereUniqueInputSchema), z.lazy(() => DocumentWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => DocumentUpdateWithWhereUniqueWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpdateWithWhereUniqueWithoutCreatedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => DocumentUpdateManyWithWhereWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUpdateManyWithWhereWithoutCreatedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional(),
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
}).strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
}).strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
}).strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
}).strict();

export const NestedEnumAuditActionFilterSchema: z.ZodType<Prisma.NestedEnumAuditActionFilter> = z.object({
  equals: z.lazy(() => AuditActionSchema).optional(),
  in: z.lazy(() => AuditActionSchema).array().optional(),
  notIn: z.lazy(() => AuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => NestedEnumAuditActionFilterSchema) ]).optional(),
}).strict();

export const NestedEnumAuditActionWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumAuditActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => AuditActionSchema).optional(),
  in: z.lazy(() => AuditActionSchema).array().optional(),
  notIn: z.lazy(() => AuditActionSchema).array().optional(),
  not: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => NestedEnumAuditActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumAuditActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumAuditActionFilterSchema).optional(),
}).strict();

export const NestedJsonNullableFilterSchema: z.ZodType<Prisma.NestedJsonNullableFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
}).strict();

export const NestedDecimalFilterSchema: z.ZodType<Prisma.NestedDecimalFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalFilterSchema) ]).optional(),
}).strict();

export const NestedDecimalNullableFilterSchema: z.ZodType<Prisma.NestedDecimalNullableFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedJsonFilterSchema: z.ZodType<Prisma.NestedJsonFilter> = z.object({
  equals: InputJsonValueSchema.optional(),
  path: z.string().array().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_starts_with: InputJsonValueSchema.optional().nullable(),
  array_ends_with: InputJsonValueSchema.optional().nullable(),
  array_contains: InputJsonValueSchema.optional().nullable(),
  lt: InputJsonValueSchema.optional(),
  lte: InputJsonValueSchema.optional(),
  gt: InputJsonValueSchema.optional(),
  gte: InputJsonValueSchema.optional(),
  not: InputJsonValueSchema.optional(),
}).strict();

export const NestedDecimalWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDecimalWithAggregatesFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _sum: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _min: z.lazy(() => NestedDecimalFilterSchema).optional(),
  _max: z.lazy(() => NestedDecimalFilterSchema).optional(),
}).strict();

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional(),
}).strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const NestedDecimalNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDecimalNullableWithAggregatesFilter> = z.object({
  equals: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  in: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  notIn: z.union([z.number().array(),z.string().array(),z.instanceof(Prisma.Decimal).array(),DecimalJsLikeSchema.array(),]).refine((v) => Array.isArray(v) && (v as any[]).every((v) => isValidDecimalInput(v)), { message: 'Must be a Decimal' }).optional().nullable(),
  lt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  lte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gt: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  gte: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  not: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NestedDecimalNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDecimalNullableFilterSchema).optional(),
}).strict();

export const NestedIntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional(),
}).strict();

export const NestedFloatNullableFilterSchema: z.ZodType<Prisma.NestedFloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumPaymentStatusFilterSchema: z.ZodType<Prisma.NestedEnumPaymentStatusFilter> = z.object({
  equals: z.lazy(() => PaymentStatusSchema).optional(),
  in: z.lazy(() => PaymentStatusSchema).array().optional(),
  notIn: z.lazy(() => PaymentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => NestedEnumPaymentStatusFilterSchema) ]).optional(),
}).strict();

export const NestedEnumPaymentFrequencyFilterSchema: z.ZodType<Prisma.NestedEnumPaymentFrequencyFilter> = z.object({
  equals: z.lazy(() => PaymentFrequencySchema).optional(),
  in: z.lazy(() => PaymentFrequencySchema).array().optional(),
  notIn: z.lazy(() => PaymentFrequencySchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => NestedEnumPaymentFrequencyFilterSchema) ]).optional(),
}).strict();

export const NestedEnumPaymentStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumPaymentStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PaymentStatusSchema).optional(),
  in: z.lazy(() => PaymentStatusSchema).array().optional(),
  notIn: z.lazy(() => PaymentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => NestedEnumPaymentStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPaymentStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPaymentStatusFilterSchema).optional(),
}).strict();

export const NestedEnumPaymentFrequencyWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumPaymentFrequencyWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PaymentFrequencySchema).optional(),
  in: z.lazy(() => PaymentFrequencySchema).array().optional(),
  notIn: z.lazy(() => PaymentFrequencySchema).array().optional(),
  not: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => NestedEnumPaymentFrequencyWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPaymentFrequencyFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPaymentFrequencyFilterSchema).optional(),
}).strict();

export const NestedEnumUserRoleFilterSchema: z.ZodType<Prisma.NestedEnumUserRoleFilter> = z.object({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleFilterSchema) ]).optional(),
}).strict();

export const NestedEnumUserStatusFilterSchema: z.ZodType<Prisma.NestedEnumUserStatusFilter> = z.object({
  equals: z.lazy(() => UserStatusSchema).optional(),
  in: z.lazy(() => UserStatusSchema).array().optional(),
  notIn: z.lazy(() => UserStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => NestedEnumUserStatusFilterSchema) ]).optional(),
}).strict();

export const NestedEnumUserRoleWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumUserRoleWithAggregatesFilter> = z.object({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
}).strict();

export const NestedEnumUserStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumUserStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => UserStatusSchema).optional(),
  in: z.lazy(() => UserStatusSchema).array().optional(),
  notIn: z.lazy(() => UserStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => NestedEnumUserStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserStatusFilterSchema).optional(),
}).strict();

export const UserCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateWithoutAccountsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAccountsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAccountsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
}).strict();

export const UserUpsertWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpsertWithoutAccountsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAccountsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
}).strict();

export const UserUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateWithoutAccountsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAccountsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserCreateWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserCreateWithoutAdminPermissionsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAdminPermissionsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAdminPermissionsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAdminPermissionsInputSchema) ]),
}).strict();

export const UserUpsertWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserUpsertWithoutAdminPermissionsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAdminPermissionsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAdminPermissionsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAdminPermissionsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAdminPermissionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAdminPermissionsInputSchema) ]),
}).strict();

export const UserUpdateWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserUpdateWithoutAdminPermissionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutAdminPermissionsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAdminPermissionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserCreateWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserCreateWithoutAuditLogsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAuditLogsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAuditLogsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAuditLogsInputSchema) ]),
}).strict();

export const UserUpsertWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserUpsertWithoutAuditLogsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAuditLogsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAuditLogsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAuditLogsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAuditLogsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAuditLogsInputSchema) ]),
}).strict();

export const UserUpdateWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserUpdateWithoutAuditLogsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutAuditLogsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAuditLogsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserCreateWithoutClientInputSchema: z.ZodType<Prisma.UserCreateWithoutClientInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutClientInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutClientInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutClientInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutClientInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutClientInputSchema), z.lazy(() => UserUncheckedCreateWithoutClientInputSchema) ]),
}).strict();

export const PaymentCreateWithoutClientInputSchema: z.ZodType<Prisma.PaymentCreateWithoutClientInput> = z.object({
  id: z.string().optional(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const PaymentUncheckedCreateWithoutClientInputSchema: z.ZodType<Prisma.PaymentUncheckedCreateWithoutClientInput> = z.object({
  id: z.string().optional(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const PaymentCreateOrConnectWithoutClientInputSchema: z.ZodType<Prisma.PaymentCreateOrConnectWithoutClientInput> = z.object({
  where: z.lazy(() => PaymentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema) ]),
}).strict();

export const PaymentCreateManyClientInputEnvelopeSchema: z.ZodType<Prisma.PaymentCreateManyClientInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => PaymentCreateManyClientInputSchema), z.lazy(() => PaymentCreateManyClientInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const UserUpsertWithoutClientInputSchema: z.ZodType<Prisma.UserUpsertWithoutClientInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutClientInputSchema), z.lazy(() => UserUncheckedUpdateWithoutClientInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutClientInputSchema), z.lazy(() => UserUncheckedCreateWithoutClientInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutClientInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutClientInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutClientInputSchema), z.lazy(() => UserUncheckedUpdateWithoutClientInputSchema) ]),
}).strict();

export const UserUpdateWithoutClientInputSchema: z.ZodType<Prisma.UserUpdateWithoutClientInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutClientInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutClientInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const PaymentUpsertWithWhereUniqueWithoutClientInputSchema: z.ZodType<Prisma.PaymentUpsertWithWhereUniqueWithoutClientInput> = z.object({
  where: z.lazy(() => PaymentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => PaymentUpdateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedUpdateWithoutClientInputSchema) ]),
  create: z.union([ z.lazy(() => PaymentCreateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedCreateWithoutClientInputSchema) ]),
}).strict();

export const PaymentUpdateWithWhereUniqueWithoutClientInputSchema: z.ZodType<Prisma.PaymentUpdateWithWhereUniqueWithoutClientInput> = z.object({
  where: z.lazy(() => PaymentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => PaymentUpdateWithoutClientInputSchema), z.lazy(() => PaymentUncheckedUpdateWithoutClientInputSchema) ]),
}).strict();

export const PaymentUpdateManyWithWhereWithoutClientInputSchema: z.ZodType<Prisma.PaymentUpdateManyWithWhereWithoutClientInput> = z.object({
  where: z.lazy(() => PaymentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => PaymentUpdateManyMutationInputSchema), z.lazy(() => PaymentUncheckedUpdateManyWithoutClientInputSchema) ]),
}).strict();

export const PaymentScalarWhereInputSchema: z.ZodType<Prisma.PaymentScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PaymentScalarWhereInputSchema), z.lazy(() => PaymentScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentScalarWhereInputSchema), z.lazy(() => PaymentScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  clientId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  stripeFee: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  totalWithFees: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumPaymentStatusFilterSchema), z.lazy(() => PaymentStatusSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => EnumPaymentFrequencyFilterSchema), z.lazy(() => PaymentFrequencySchema) ]).optional(),
  dueDate: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  paidAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  attachedFiles: z.lazy(() => StringNullableListFilterSchema).optional(),
  receiptUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const ProviderCreateWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderCreateWithoutDocumentsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  siret: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const ProviderUncheckedCreateWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderUncheckedCreateWithoutDocumentsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  siret: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tvaRate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const ProviderCreateOrConnectWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderCreateOrConnectWithoutDocumentsInput> = z.object({
  where: z.lazy(() => ProviderWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProviderCreateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedCreateWithoutDocumentsInputSchema) ]),
}).strict();

export const UserCreateWithoutDocumentsInputSchema: z.ZodType<Prisma.UserCreateWithoutDocumentsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutDocumentsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutDocumentsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutDocumentsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutDocumentsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocumentsInputSchema) ]),
}).strict();

export const ProviderUpsertWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderUpsertWithoutDocumentsInput> = z.object({
  update: z.union([ z.lazy(() => ProviderUpdateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedUpdateWithoutDocumentsInputSchema) ]),
  create: z.union([ z.lazy(() => ProviderCreateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedCreateWithoutDocumentsInputSchema) ]),
  where: z.lazy(() => ProviderWhereInputSchema).optional(),
}).strict();

export const ProviderUpdateToOneWithWhereWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderUpdateToOneWithWhereWithoutDocumentsInput> = z.object({
  where: z.lazy(() => ProviderWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProviderUpdateWithoutDocumentsInputSchema), z.lazy(() => ProviderUncheckedUpdateWithoutDocumentsInputSchema) ]),
}).strict();

export const ProviderUpdateWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderUpdateWithoutDocumentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProviderUncheckedUpdateWithoutDocumentsInputSchema: z.ZodType<Prisma.ProviderUncheckedUpdateWithoutDocumentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  legalName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  address: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  city: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bankName: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  iban: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bic: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tvaRate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUpsertWithoutDocumentsInputSchema: z.ZodType<Prisma.UserUpsertWithoutDocumentsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocumentsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocumentsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutDocumentsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutDocumentsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutDocumentsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocumentsInputSchema) ]),
}).strict();

export const UserUpdateWithoutDocumentsInputSchema: z.ZodType<Prisma.UserUpdateWithoutDocumentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutDocumentsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutDocumentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
}).strict();

export const UserCreateWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateWithoutAvatarInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAvatarInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAvatarInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]),
}).strict();

export const UserCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateWithoutCoverImageInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutCoverImageInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutCoverImageInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]),
}).strict();

export const UserUpsertWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpsertWithoutAvatarInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAvatarInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]),
}).strict();

export const UserUpdateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpdateWithoutAvatarInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAvatarInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUpsertWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpsertWithoutCoverImageInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutCoverImageInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]),
}).strict();

export const UserUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpdateWithoutCoverImageInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutCoverImageInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const ClientCreateWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientCreateWithoutPaymentsInput> = z.object({
  id: z.string().optional(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutClientInputSchema),
}).strict();

export const ClientUncheckedCreateWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientUncheckedCreateWithoutPaymentsInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const ClientCreateOrConnectWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientCreateOrConnectWithoutPaymentsInput> = z.object({
  where: z.lazy(() => ClientWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ClientCreateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedCreateWithoutPaymentsInputSchema) ]),
}).strict();

export const ClientUpsertWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientUpsertWithoutPaymentsInput> = z.object({
  update: z.union([ z.lazy(() => ClientUpdateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutPaymentsInputSchema) ]),
  create: z.union([ z.lazy(() => ClientCreateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedCreateWithoutPaymentsInputSchema) ]),
  where: z.lazy(() => ClientWhereInputSchema).optional(),
}).strict();

export const ClientUpdateToOneWithWhereWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientUpdateToOneWithWhereWithoutPaymentsInput> = z.object({
  where: z.lazy(() => ClientWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ClientUpdateWithoutPaymentsInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutPaymentsInputSchema) ]),
}).strict();

export const ClientUpdateWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientUpdateWithoutPaymentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutClientNestedInputSchema).optional(),
}).strict();

export const ClientUncheckedUpdateWithoutPaymentsInputSchema: z.ZodType<Prisma.ClientUncheckedUpdateWithoutPaymentsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentCreateWithoutProviderInputSchema: z.ZodType<Prisma.DocumentCreateWithoutProviderInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  createdByUser: z.lazy(() => UserCreateNestedOneWithoutDocumentsInputSchema),
}).strict();

export const DocumentUncheckedCreateWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUncheckedCreateWithoutProviderInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  createdBy: z.string(),
}).strict();

export const DocumentCreateOrConnectWithoutProviderInputSchema: z.ZodType<Prisma.DocumentCreateOrConnectWithoutProviderInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema) ]),
}).strict();

export const DocumentCreateManyProviderInputEnvelopeSchema: z.ZodType<Prisma.DocumentCreateManyProviderInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DocumentCreateManyProviderInputSchema), z.lazy(() => DocumentCreateManyProviderInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const DocumentUpsertWithWhereUniqueWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUpsertWithWhereUniqueWithoutProviderInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DocumentUpdateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedUpdateWithoutProviderInputSchema) ]),
  create: z.union([ z.lazy(() => DocumentCreateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutProviderInputSchema) ]),
}).strict();

export const DocumentUpdateWithWhereUniqueWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUpdateWithWhereUniqueWithoutProviderInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DocumentUpdateWithoutProviderInputSchema), z.lazy(() => DocumentUncheckedUpdateWithoutProviderInputSchema) ]),
}).strict();

export const DocumentUpdateManyWithWhereWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUpdateManyWithWhereWithoutProviderInput> = z.object({
  where: z.lazy(() => DocumentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DocumentUpdateManyMutationInputSchema), z.lazy(() => DocumentUncheckedUpdateManyWithoutProviderInputSchema) ]),
}).strict();

export const DocumentScalarWhereInputSchema: z.ZodType<Prisma.DocumentScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DocumentScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DocumentScalarWhereInputSchema), z.lazy(() => DocumentScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  invoiceNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  quoteNumber: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  contractRef: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  clientSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  clientCountry: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerLegal: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerSiret: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerCity: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerEmail: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  providerPhone: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  items: z.lazy(() => JsonFilterSchema).optional(),
  subtotal: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tva: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  total: z.union([ z.lazy(() => DecimalFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional(),
  tvaRate: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  railwayEstimate: z.union([ z.lazy(() => DecimalNullableFilterSchema), z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }) ]).optional().nullable(),
  pdfUrl: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  fileSize: z.union([ z.lazy(() => IntNullableFilterSchema), z.number() ]).optional().nullable(),
  createdBy: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
}).strict();

export const UserCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateWithoutSessionsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserUncheckedCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSessionsInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  status: z.lazy(() => UserStatusSchema).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  bannedAt: z.coerce.date().optional().nullable(),
  bannedBy: z.string().optional().nullable(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.coerce.date().optional().nullable(),
  suspensionReason: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  lastLoginIp: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedCreateNestedManyWithoutCreatedByUserInputSchema).optional(),
}).strict();

export const UserCreateOrConnectWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutSessionsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
}).strict();

export const UserUpsertWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpsertWithoutSessionsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
}).strict();

export const UserUpdateToOneWithWhereWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutSessionsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
}).strict();

export const UserUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateWithoutSessionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const UserUncheckedUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutSessionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => UserStatusSchema), z.lazy(() => EnumUserStatusFieldUpdateOperationsInputSchema) ]).optional(),
  isBanned: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  banReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  bannedBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isSuspended: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  suspendedUntil: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  suspensionReason: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastLoginIp: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  auditLogs: z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  adminPermissions: z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  client: z.lazy(() => ClientUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  documents: z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserNestedInputSchema).optional(),
}).strict();

export const MediaCreateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateWithoutAvatarUserInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  coverUser: z.lazy(() => UserCreateNestedOneWithoutCoverImageInputSchema).optional(),
}).strict();

export const MediaUncheckedCreateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateWithoutAvatarUserInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  coverUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const MediaCreateOrConnectWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateOrConnectWithoutAvatarUserInput> = z.object({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]),
}).strict();

export const MediaCreateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateWithoutCoverUserInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  avatarUser: z.lazy(() => UserCreateNestedOneWithoutAvatarInputSchema).optional(),
}).strict();

export const MediaUncheckedCreateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateWithoutCoverUserInput> = z.object({
  id: z.string().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const MediaCreateOrConnectWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateOrConnectWithoutCoverUserInput> = z.object({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]),
}).strict();

export const SessionCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateWithoutUserInput> = z.object({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SessionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateWithoutUserInput> = z.object({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const SessionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const SessionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.SessionCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => SessionCreateManyUserInputSchema), z.lazy(() => SessionCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AccountCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateWithoutUserInput> = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AccountUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateWithoutUserInput> = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AccountCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AccountCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.AccountCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AccountCreateManyUserInputSchema), z.lazy(() => AccountCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AuditLogCreateWithoutUserInputSchema: z.ZodType<Prisma.AuditLogCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const AuditLogUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const AuditLogCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.AuditLogCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => AuditLogWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AuditLogCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.AuditLogCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AuditLogCreateManyUserInputSchema), z.lazy(() => AuditLogCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AdminPermissionCreateWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AdminPermissionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AdminPermissionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => AdminPermissionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AdminPermissionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.AdminPermissionCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AdminPermissionCreateManyUserInputSchema), z.lazy(() => AdminPermissionCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ClientCreateWithoutUserInputSchema: z.ZodType<Prisma.ClientCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  payments: z.lazy(() => PaymentCreateNestedManyWithoutClientInputSchema).optional(),
}).strict();

export const ClientUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.ClientUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  companyName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingCountry: z.string().optional(),
  siret: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  payments: z.lazy(() => PaymentUncheckedCreateNestedManyWithoutClientInputSchema).optional(),
}).strict();

export const ClientCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.ClientCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => ClientWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const DocumentCreateWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentCreateWithoutCreatedByUserInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  provider: z.lazy(() => ProviderCreateNestedOneWithoutDocumentsInputSchema).optional(),
}).strict();

export const DocumentUncheckedCreateWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUncheckedCreateWithoutCreatedByUserInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
}).strict();

export const DocumentCreateOrConnectWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentCreateOrConnectWithoutCreatedByUserInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema) ]),
}).strict();

export const DocumentCreateManyCreatedByUserInputEnvelopeSchema: z.ZodType<Prisma.DocumentCreateManyCreatedByUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => DocumentCreateManyCreatedByUserInputSchema), z.lazy(() => DocumentCreateManyCreatedByUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const MediaUpsertWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpsertWithoutAvatarUserInput> = z.object({
  update: z.union([ z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]),
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]),
  where: z.lazy(() => MediaWhereInputSchema).optional(),
}).strict();

export const MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpdateToOneWithWhereWithoutAvatarUserInput> = z.object({
  where: z.lazy(() => MediaWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]),
}).strict();

export const MediaUpdateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpdateWithoutAvatarUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverUser: z.lazy(() => UserUpdateOneWithoutCoverImageNestedInputSchema).optional(),
}).strict();

export const MediaUncheckedUpdateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateWithoutAvatarUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MediaUpsertWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpsertWithoutCoverUserInput> = z.object({
  update: z.union([ z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]),
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]),
  where: z.lazy(() => MediaWhereInputSchema).optional(),
}).strict();

export const MediaUpdateToOneWithWhereWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpdateToOneWithWhereWithoutCoverUserInput> = z.object({
  where: z.lazy(() => MediaWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]),
}).strict();

export const MediaUpdateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpdateWithoutCoverUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUser: z.lazy(() => UserUpdateOneWithoutAvatarNestedInputSchema).optional(),
}).strict();

export const MediaUncheckedUpdateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateWithoutCoverUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema), z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const SessionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema), z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const SessionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => SessionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateManyMutationInputSchema), z.lazy(() => SessionUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const SessionScalarWhereInputSchema: z.ZodType<Prisma.SessionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SessionScalarWhereInputSchema), z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionScalarWhereInputSchema), z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AccountUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema), z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AccountUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema), z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const AccountUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => AccountScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateManyMutationInputSchema), z.lazy(() => AccountUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const AccountScalarWhereInputSchema: z.ZodType<Prisma.AccountScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AccountScalarWhereInputSchema), z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountScalarWhereInputSchema), z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accountId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  providerId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  accessToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  refreshToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  idToken: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  password: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AuditLogUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AuditLogWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AuditLogUpdateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => AuditLogCreateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AuditLogUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AuditLogWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AuditLogUpdateWithoutUserInputSchema), z.lazy(() => AuditLogUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const AuditLogUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => AuditLogScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AuditLogUpdateManyMutationInputSchema), z.lazy(() => AuditLogUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const AuditLogScalarWhereInputSchema: z.ZodType<Prisma.AuditLogScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AuditLogScalarWhereInputSchema), z.lazy(() => AuditLogScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AuditLogScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AuditLogScalarWhereInputSchema), z.lazy(() => AuditLogScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entityId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  action: z.union([ z.lazy(() => EnumAuditActionFilterSchema), z.lazy(() => AuditActionSchema) ]).optional(),
  changes: z.lazy(() => JsonNullableFilterSchema).optional(),
  ipAddress: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  userAgent: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const AdminPermissionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AdminPermissionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AdminPermissionUpdateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => AdminPermissionCreateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AdminPermissionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AdminPermissionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AdminPermissionUpdateWithoutUserInputSchema), z.lazy(() => AdminPermissionUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const AdminPermissionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => AdminPermissionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AdminPermissionUpdateManyMutationInputSchema), z.lazy(() => AdminPermissionUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const AdminPermissionScalarWhereInputSchema: z.ZodType<Prisma.AdminPermissionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AdminPermissionScalarWhereInputSchema), z.lazy(() => AdminPermissionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AdminPermissionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AdminPermissionScalarWhereInputSchema), z.lazy(() => AdminPermissionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  entity: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  canCreate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canRead: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canUpdate: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  canDelete: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}).strict();

export const ClientUpsertWithoutUserInputSchema: z.ZodType<Prisma.ClientUpsertWithoutUserInput> = z.object({
  update: z.union([ z.lazy(() => ClientUpdateWithoutUserInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => ClientCreateWithoutUserInputSchema), z.lazy(() => ClientUncheckedCreateWithoutUserInputSchema) ]),
  where: z.lazy(() => ClientWhereInputSchema).optional(),
}).strict();

export const ClientUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.ClientUpdateToOneWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => ClientWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ClientUpdateWithoutUserInputSchema), z.lazy(() => ClientUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const ClientUpdateWithoutUserInputSchema: z.ZodType<Prisma.ClientUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  payments: z.lazy(() => PaymentUpdateManyWithoutClientNestedInputSchema).optional(),
}).strict();

export const ClientUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.ClientUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  companyName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingAddress: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  billingCountry: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  siret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  payments: z.lazy(() => PaymentUncheckedUpdateManyWithoutClientNestedInputSchema).optional(),
}).strict();

export const DocumentUpsertWithWhereUniqueWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUpsertWithWhereUniqueWithoutCreatedByUserInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => DocumentUpdateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedUpdateWithoutCreatedByUserInputSchema) ]),
  create: z.union([ z.lazy(() => DocumentCreateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedCreateWithoutCreatedByUserInputSchema) ]),
}).strict();

export const DocumentUpdateWithWhereUniqueWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUpdateWithWhereUniqueWithoutCreatedByUserInput> = z.object({
  where: z.lazy(() => DocumentWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => DocumentUpdateWithoutCreatedByUserInputSchema), z.lazy(() => DocumentUncheckedUpdateWithoutCreatedByUserInputSchema) ]),
}).strict();

export const DocumentUpdateManyWithWhereWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUpdateManyWithWhereWithoutCreatedByUserInput> = z.object({
  where: z.lazy(() => DocumentScalarWhereInputSchema),
  data: z.union([ z.lazy(() => DocumentUpdateManyMutationInputSchema), z.lazy(() => DocumentUncheckedUpdateManyWithoutCreatedByUserInputSchema) ]),
}).strict();

export const PaymentCreateManyClientInputSchema: z.ZodType<Prisma.PaymentCreateManyClientInput> = z.object({
  id: z.string().optional(),
  amount: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  stripeFee: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional(),
  totalWithFees: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  description: z.string(),
  status: z.lazy(() => PaymentStatusSchema).optional(),
  frequency: z.lazy(() => PaymentFrequencySchema).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentCreateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const PaymentUpdateWithoutClientInputSchema: z.ZodType<Prisma.PaymentUpdateWithoutClientInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PaymentUncheckedUpdateWithoutClientInputSchema: z.ZodType<Prisma.PaymentUncheckedUpdateWithoutClientInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PaymentUncheckedUpdateManyWithoutClientInputSchema: z.ZodType<Prisma.PaymentUncheckedUpdateManyWithoutClientInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  stripeFee: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  totalWithFees: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => PaymentStatusSchema), z.lazy(() => EnumPaymentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  frequency: z.union([ z.lazy(() => PaymentFrequencySchema), z.lazy(() => EnumPaymentFrequencyFieldUpdateOperationsInputSchema) ]).optional(),
  dueDate: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  paidAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripePaymentIntentId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  attachedFiles: z.union([ z.lazy(() => PaymentUpdateattachedFilesInputSchema), z.string().array() ]).optional(),
  receiptUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentCreateManyProviderInputSchema: z.ZodType<Prisma.DocumentCreateManyProviderInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  createdBy: z.string(),
}).strict();

export const DocumentUpdateWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUpdateWithoutProviderInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdByUser: z.lazy(() => UserUpdateOneRequiredWithoutDocumentsNestedInputSchema).optional(),
}).strict();

export const DocumentUncheckedUpdateWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateWithoutProviderInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentUncheckedUpdateManyWithoutProviderInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateManyWithoutProviderInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionCreateManyUserInputSchema: z.ZodType<Prisma.SessionCreateManyUserInput> = z.object({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AccountCreateManyUserInputSchema: z.ZodType<Prisma.AccountCreateManyUserInput> = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const AuditLogCreateManyUserInputSchema: z.ZodType<Prisma.AuditLogCreateManyUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  entityId: z.string(),
  action: z.lazy(() => AuditActionSchema),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const AdminPermissionCreateManyUserInputSchema: z.ZodType<Prisma.AdminPermissionCreateManyUserInput> = z.object({
  id: z.string().optional(),
  entity: z.string(),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).strict();

export const DocumentCreateManyCreatedByUserInputSchema: z.ZodType<Prisma.DocumentCreateManyCreatedByUserInput> = z.object({
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  type: z.string(),
  name: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  contractRef: z.string().optional().nullable(),
  clientName: z.string(),
  clientSiret: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  clientCity: z.string().optional().nullable(),
  clientCountry: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  providerName: z.string(),
  providerLegal: z.string().optional().nullable(),
  providerSiret: z.string().optional().nullable(),
  providerAddress: z.string().optional().nullable(),
  providerCity: z.string().optional().nullable(),
  providerEmail: z.string().optional().nullable(),
  providerPhone: z.string().optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]),
  subtotal: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tva: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  total: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),
  tvaRate: z.number().optional(),
  railwayEstimate: z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
}).strict();

export const SessionUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  accessToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  accessTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  refreshTokenExpiresAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  idToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  password: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogUpdateWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AuditLogUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.AuditLogUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entityId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  action: z.union([ z.lazy(() => AuditActionSchema), z.lazy(() => EnumAuditActionFieldUpdateOperationsInputSchema) ]).optional(),
  changes: z.union([ z.lazy(() => NullableJsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionUpdateWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AdminPermissionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.AdminPermissionUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  entity: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  canCreate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canRead: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canUpdate: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  canDelete: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DocumentUpdateWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUpdateWithoutCreatedByUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  provider: z.lazy(() => ProviderUpdateOneWithoutDocumentsNestedInputSchema).optional(),
}).strict();

export const DocumentUncheckedUpdateWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateWithoutCreatedByUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const DocumentUncheckedUpdateManyWithoutCreatedByUserInputSchema: z.ZodType<Prisma.DocumentUncheckedUpdateManyWithoutCreatedByUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  invoiceNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  quoteNumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  contractRef: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  clientSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  clientCountry: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerLegal: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerSiret: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerCity: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerEmail: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  providerPhone: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  items: z.union([ z.lazy(() => JsonNullValueInputSchema), InputJsonValueSchema ]).optional(),
  subtotal: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tva: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  total: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => DecimalFieldUpdateOperationsInputSchema) ]).optional(),
  tvaRate: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  railwayEstimate: z.union([ z.union([z.number(),z.string(),z.instanceof(Prisma.Decimal),DecimalJsLikeSchema,]).refine((v) => isValidDecimalInput(v), { message: 'Must be a Decimal' }),z.lazy(() => NullableDecimalFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pdfUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  fileSize: z.union([ z.number(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const AccountFindFirstArgsSchema: z.ZodType<Prisma.AccountFindFirstArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(), 
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(), AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema, AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AccountFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AccountFindFirstOrThrowArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(), 
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(), AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema, AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AccountFindManyArgsSchema: z.ZodType<Prisma.AccountFindManyArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(), 
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(), AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema, AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AccountAggregateArgsSchema: z.ZodType<Prisma.AccountAggregateArgs> = z.object({
  where: AccountWhereInputSchema.optional(), 
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(), AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AccountGroupByArgsSchema: z.ZodType<Prisma.AccountGroupByArgs> = z.object({
  where: AccountWhereInputSchema.optional(), 
  orderBy: z.union([ AccountOrderByWithAggregationInputSchema.array(), AccountOrderByWithAggregationInputSchema ]).optional(),
  by: AccountScalarFieldEnumSchema.array(), 
  having: AccountScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AccountFindUniqueArgsSchema: z.ZodType<Prisma.AccountFindUniqueArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema, 
}).strict();

export const AccountFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AccountFindUniqueOrThrowArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema, 
}).strict();

export const AdminPermissionFindFirstArgsSchema: z.ZodType<Prisma.AdminPermissionFindFirstArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereInputSchema.optional(), 
  orderBy: z.union([ AdminPermissionOrderByWithRelationInputSchema.array(), AdminPermissionOrderByWithRelationInputSchema ]).optional(),
  cursor: AdminPermissionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AdminPermissionScalarFieldEnumSchema, AdminPermissionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AdminPermissionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AdminPermissionFindFirstOrThrowArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereInputSchema.optional(), 
  orderBy: z.union([ AdminPermissionOrderByWithRelationInputSchema.array(), AdminPermissionOrderByWithRelationInputSchema ]).optional(),
  cursor: AdminPermissionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AdminPermissionScalarFieldEnumSchema, AdminPermissionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AdminPermissionFindManyArgsSchema: z.ZodType<Prisma.AdminPermissionFindManyArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereInputSchema.optional(), 
  orderBy: z.union([ AdminPermissionOrderByWithRelationInputSchema.array(), AdminPermissionOrderByWithRelationInputSchema ]).optional(),
  cursor: AdminPermissionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AdminPermissionScalarFieldEnumSchema, AdminPermissionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AdminPermissionAggregateArgsSchema: z.ZodType<Prisma.AdminPermissionAggregateArgs> = z.object({
  where: AdminPermissionWhereInputSchema.optional(), 
  orderBy: z.union([ AdminPermissionOrderByWithRelationInputSchema.array(), AdminPermissionOrderByWithRelationInputSchema ]).optional(),
  cursor: AdminPermissionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AdminPermissionGroupByArgsSchema: z.ZodType<Prisma.AdminPermissionGroupByArgs> = z.object({
  where: AdminPermissionWhereInputSchema.optional(), 
  orderBy: z.union([ AdminPermissionOrderByWithAggregationInputSchema.array(), AdminPermissionOrderByWithAggregationInputSchema ]).optional(),
  by: AdminPermissionScalarFieldEnumSchema.array(), 
  having: AdminPermissionScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AdminPermissionFindUniqueArgsSchema: z.ZodType<Prisma.AdminPermissionFindUniqueArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereUniqueInputSchema, 
}).strict();

export const AdminPermissionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AdminPermissionFindUniqueOrThrowArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereUniqueInputSchema, 
}).strict();

export const AuditLogFindFirstArgsSchema: z.ZodType<Prisma.AuditLogFindFirstArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereInputSchema.optional(), 
  orderBy: z.union([ AuditLogOrderByWithRelationInputSchema.array(), AuditLogOrderByWithRelationInputSchema ]).optional(),
  cursor: AuditLogWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AuditLogScalarFieldEnumSchema, AuditLogScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AuditLogFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AuditLogFindFirstOrThrowArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereInputSchema.optional(), 
  orderBy: z.union([ AuditLogOrderByWithRelationInputSchema.array(), AuditLogOrderByWithRelationInputSchema ]).optional(),
  cursor: AuditLogWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AuditLogScalarFieldEnumSchema, AuditLogScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AuditLogFindManyArgsSchema: z.ZodType<Prisma.AuditLogFindManyArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereInputSchema.optional(), 
  orderBy: z.union([ AuditLogOrderByWithRelationInputSchema.array(), AuditLogOrderByWithRelationInputSchema ]).optional(),
  cursor: AuditLogWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AuditLogScalarFieldEnumSchema, AuditLogScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const AuditLogAggregateArgsSchema: z.ZodType<Prisma.AuditLogAggregateArgs> = z.object({
  where: AuditLogWhereInputSchema.optional(), 
  orderBy: z.union([ AuditLogOrderByWithRelationInputSchema.array(), AuditLogOrderByWithRelationInputSchema ]).optional(),
  cursor: AuditLogWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AuditLogGroupByArgsSchema: z.ZodType<Prisma.AuditLogGroupByArgs> = z.object({
  where: AuditLogWhereInputSchema.optional(), 
  orderBy: z.union([ AuditLogOrderByWithAggregationInputSchema.array(), AuditLogOrderByWithAggregationInputSchema ]).optional(),
  by: AuditLogScalarFieldEnumSchema.array(), 
  having: AuditLogScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const AuditLogFindUniqueArgsSchema: z.ZodType<Prisma.AuditLogFindUniqueArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereUniqueInputSchema, 
}).strict();

export const AuditLogFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AuditLogFindUniqueOrThrowArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereUniqueInputSchema, 
}).strict();

export const ClientFindFirstArgsSchema: z.ZodType<Prisma.ClientFindFirstArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereInputSchema.optional(), 
  orderBy: z.union([ ClientOrderByWithRelationInputSchema.array(), ClientOrderByWithRelationInputSchema ]).optional(),
  cursor: ClientWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ClientScalarFieldEnumSchema, ClientScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ClientFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ClientFindFirstOrThrowArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereInputSchema.optional(), 
  orderBy: z.union([ ClientOrderByWithRelationInputSchema.array(), ClientOrderByWithRelationInputSchema ]).optional(),
  cursor: ClientWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ClientScalarFieldEnumSchema, ClientScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ClientFindManyArgsSchema: z.ZodType<Prisma.ClientFindManyArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereInputSchema.optional(), 
  orderBy: z.union([ ClientOrderByWithRelationInputSchema.array(), ClientOrderByWithRelationInputSchema ]).optional(),
  cursor: ClientWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ClientScalarFieldEnumSchema, ClientScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ClientAggregateArgsSchema: z.ZodType<Prisma.ClientAggregateArgs> = z.object({
  where: ClientWhereInputSchema.optional(), 
  orderBy: z.union([ ClientOrderByWithRelationInputSchema.array(), ClientOrderByWithRelationInputSchema ]).optional(),
  cursor: ClientWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ClientGroupByArgsSchema: z.ZodType<Prisma.ClientGroupByArgs> = z.object({
  where: ClientWhereInputSchema.optional(), 
  orderBy: z.union([ ClientOrderByWithAggregationInputSchema.array(), ClientOrderByWithAggregationInputSchema ]).optional(),
  by: ClientScalarFieldEnumSchema.array(), 
  having: ClientScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ClientFindUniqueArgsSchema: z.ZodType<Prisma.ClientFindUniqueArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereUniqueInputSchema, 
}).strict();

export const ClientFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ClientFindUniqueOrThrowArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereUniqueInputSchema, 
}).strict();

export const DocumentFindFirstArgsSchema: z.ZodType<Prisma.DocumentFindFirstArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereInputSchema.optional(), 
  orderBy: z.union([ DocumentOrderByWithRelationInputSchema.array(), DocumentOrderByWithRelationInputSchema ]).optional(),
  cursor: DocumentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DocumentScalarFieldEnumSchema, DocumentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DocumentFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DocumentFindFirstOrThrowArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereInputSchema.optional(), 
  orderBy: z.union([ DocumentOrderByWithRelationInputSchema.array(), DocumentOrderByWithRelationInputSchema ]).optional(),
  cursor: DocumentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DocumentScalarFieldEnumSchema, DocumentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DocumentFindManyArgsSchema: z.ZodType<Prisma.DocumentFindManyArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereInputSchema.optional(), 
  orderBy: z.union([ DocumentOrderByWithRelationInputSchema.array(), DocumentOrderByWithRelationInputSchema ]).optional(),
  cursor: DocumentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DocumentScalarFieldEnumSchema, DocumentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const DocumentAggregateArgsSchema: z.ZodType<Prisma.DocumentAggregateArgs> = z.object({
  where: DocumentWhereInputSchema.optional(), 
  orderBy: z.union([ DocumentOrderByWithRelationInputSchema.array(), DocumentOrderByWithRelationInputSchema ]).optional(),
  cursor: DocumentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DocumentGroupByArgsSchema: z.ZodType<Prisma.DocumentGroupByArgs> = z.object({
  where: DocumentWhereInputSchema.optional(), 
  orderBy: z.union([ DocumentOrderByWithAggregationInputSchema.array(), DocumentOrderByWithAggregationInputSchema ]).optional(),
  by: DocumentScalarFieldEnumSchema.array(), 
  having: DocumentScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const DocumentFindUniqueArgsSchema: z.ZodType<Prisma.DocumentFindUniqueArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereUniqueInputSchema, 
}).strict();

export const DocumentFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DocumentFindUniqueOrThrowArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereUniqueInputSchema, 
}).strict();

export const MediaFindFirstArgsSchema: z.ZodType<Prisma.MediaFindFirstArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereInputSchema.optional(), 
  orderBy: z.union([ MediaOrderByWithRelationInputSchema.array(), MediaOrderByWithRelationInputSchema ]).optional(),
  cursor: MediaWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MediaScalarFieldEnumSchema, MediaScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MediaFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MediaFindFirstOrThrowArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereInputSchema.optional(), 
  orderBy: z.union([ MediaOrderByWithRelationInputSchema.array(), MediaOrderByWithRelationInputSchema ]).optional(),
  cursor: MediaWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MediaScalarFieldEnumSchema, MediaScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MediaFindManyArgsSchema: z.ZodType<Prisma.MediaFindManyArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereInputSchema.optional(), 
  orderBy: z.union([ MediaOrderByWithRelationInputSchema.array(), MediaOrderByWithRelationInputSchema ]).optional(),
  cursor: MediaWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MediaScalarFieldEnumSchema, MediaScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MediaAggregateArgsSchema: z.ZodType<Prisma.MediaAggregateArgs> = z.object({
  where: MediaWhereInputSchema.optional(), 
  orderBy: z.union([ MediaOrderByWithRelationInputSchema.array(), MediaOrderByWithRelationInputSchema ]).optional(),
  cursor: MediaWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const MediaGroupByArgsSchema: z.ZodType<Prisma.MediaGroupByArgs> = z.object({
  where: MediaWhereInputSchema.optional(), 
  orderBy: z.union([ MediaOrderByWithAggregationInputSchema.array(), MediaOrderByWithAggregationInputSchema ]).optional(),
  by: MediaScalarFieldEnumSchema.array(), 
  having: MediaScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const MediaFindUniqueArgsSchema: z.ZodType<Prisma.MediaFindUniqueArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereUniqueInputSchema, 
}).strict();

export const MediaFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MediaFindUniqueOrThrowArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereUniqueInputSchema, 
}).strict();

export const PaymentFindFirstArgsSchema: z.ZodType<Prisma.PaymentFindFirstArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentOrderByWithRelationInputSchema.array(), PaymentOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentScalarFieldEnumSchema, PaymentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentFindFirstOrThrowArgsSchema: z.ZodType<Prisma.PaymentFindFirstOrThrowArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentOrderByWithRelationInputSchema.array(), PaymentOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentScalarFieldEnumSchema, PaymentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentFindManyArgsSchema: z.ZodType<Prisma.PaymentFindManyArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentOrderByWithRelationInputSchema.array(), PaymentOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentScalarFieldEnumSchema, PaymentScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentAggregateArgsSchema: z.ZodType<Prisma.PaymentAggregateArgs> = z.object({
  where: PaymentWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentOrderByWithRelationInputSchema.array(), PaymentOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const PaymentGroupByArgsSchema: z.ZodType<Prisma.PaymentGroupByArgs> = z.object({
  where: PaymentWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentOrderByWithAggregationInputSchema.array(), PaymentOrderByWithAggregationInputSchema ]).optional(),
  by: PaymentScalarFieldEnumSchema.array(), 
  having: PaymentScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const PaymentFindUniqueArgsSchema: z.ZodType<Prisma.PaymentFindUniqueArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereUniqueInputSchema, 
}).strict();

export const PaymentFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.PaymentFindUniqueOrThrowArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereUniqueInputSchema, 
}).strict();

export const ProviderFindFirstArgsSchema: z.ZodType<Prisma.ProviderFindFirstArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereInputSchema.optional(), 
  orderBy: z.union([ ProviderOrderByWithRelationInputSchema.array(), ProviderOrderByWithRelationInputSchema ]).optional(),
  cursor: ProviderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProviderScalarFieldEnumSchema, ProviderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ProviderFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ProviderFindFirstOrThrowArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereInputSchema.optional(), 
  orderBy: z.union([ ProviderOrderByWithRelationInputSchema.array(), ProviderOrderByWithRelationInputSchema ]).optional(),
  cursor: ProviderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProviderScalarFieldEnumSchema, ProviderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ProviderFindManyArgsSchema: z.ZodType<Prisma.ProviderFindManyArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereInputSchema.optional(), 
  orderBy: z.union([ ProviderOrderByWithRelationInputSchema.array(), ProviderOrderByWithRelationInputSchema ]).optional(),
  cursor: ProviderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProviderScalarFieldEnumSchema, ProviderScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ProviderAggregateArgsSchema: z.ZodType<Prisma.ProviderAggregateArgs> = z.object({
  where: ProviderWhereInputSchema.optional(), 
  orderBy: z.union([ ProviderOrderByWithRelationInputSchema.array(), ProviderOrderByWithRelationInputSchema ]).optional(),
  cursor: ProviderWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ProviderGroupByArgsSchema: z.ZodType<Prisma.ProviderGroupByArgs> = z.object({
  where: ProviderWhereInputSchema.optional(), 
  orderBy: z.union([ ProviderOrderByWithAggregationInputSchema.array(), ProviderOrderByWithAggregationInputSchema ]).optional(),
  by: ProviderScalarFieldEnumSchema.array(), 
  having: ProviderScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ProviderFindUniqueArgsSchema: z.ZodType<Prisma.ProviderFindUniqueArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereUniqueInputSchema, 
}).strict();

export const ProviderFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ProviderFindUniqueOrThrowArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereUniqueInputSchema, 
}).strict();

export const SessionFindFirstArgsSchema: z.ZodType<Prisma.SessionFindFirstArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(), 
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(), SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema, SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SessionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SessionFindFirstOrThrowArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(), 
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(), SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema, SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SessionFindManyArgsSchema: z.ZodType<Prisma.SessionFindManyArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(), 
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(), SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema, SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SessionAggregateArgsSchema: z.ZodType<Prisma.SessionAggregateArgs> = z.object({
  where: SessionWhereInputSchema.optional(), 
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(), SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SessionGroupByArgsSchema: z.ZodType<Prisma.SessionGroupByArgs> = z.object({
  where: SessionWhereInputSchema.optional(), 
  orderBy: z.union([ SessionOrderByWithAggregationInputSchema.array(), SessionOrderByWithAggregationInputSchema ]).optional(),
  by: SessionScalarFieldEnumSchema.array(), 
  having: SessionScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SessionFindUniqueArgsSchema: z.ZodType<Prisma.SessionFindUniqueArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema, 
}).strict();

export const SessionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SessionFindUniqueOrThrowArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema, 
}).strict();

export const SettingsFindFirstArgsSchema: z.ZodType<Prisma.SettingsFindFirstArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereInputSchema.optional(), 
  orderBy: z.union([ SettingsOrderByWithRelationInputSchema.array(), SettingsOrderByWithRelationInputSchema ]).optional(),
  cursor: SettingsWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SettingsScalarFieldEnumSchema, SettingsScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SettingsFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SettingsFindFirstOrThrowArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereInputSchema.optional(), 
  orderBy: z.union([ SettingsOrderByWithRelationInputSchema.array(), SettingsOrderByWithRelationInputSchema ]).optional(),
  cursor: SettingsWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SettingsScalarFieldEnumSchema, SettingsScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SettingsFindManyArgsSchema: z.ZodType<Prisma.SettingsFindManyArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereInputSchema.optional(), 
  orderBy: z.union([ SettingsOrderByWithRelationInputSchema.array(), SettingsOrderByWithRelationInputSchema ]).optional(),
  cursor: SettingsWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SettingsScalarFieldEnumSchema, SettingsScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SettingsAggregateArgsSchema: z.ZodType<Prisma.SettingsAggregateArgs> = z.object({
  where: SettingsWhereInputSchema.optional(), 
  orderBy: z.union([ SettingsOrderByWithRelationInputSchema.array(), SettingsOrderByWithRelationInputSchema ]).optional(),
  cursor: SettingsWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SettingsGroupByArgsSchema: z.ZodType<Prisma.SettingsGroupByArgs> = z.object({
  where: SettingsWhereInputSchema.optional(), 
  orderBy: z.union([ SettingsOrderByWithAggregationInputSchema.array(), SettingsOrderByWithAggregationInputSchema ]).optional(),
  by: SettingsScalarFieldEnumSchema.array(), 
  having: SettingsScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SettingsFindUniqueArgsSchema: z.ZodType<Prisma.SettingsFindUniqueArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereUniqueInputSchema, 
}).strict();

export const SettingsFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SettingsFindUniqueOrThrowArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereUniqueInputSchema, 
}).strict();

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  orderBy: z.union([ UserOrderByWithAggregationInputSchema.array(), UserOrderByWithAggregationInputSchema ]).optional(),
  by: UserScalarFieldEnumSchema.array(), 
  having: UserScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const VerificationFindFirstArgsSchema: z.ZodType<Prisma.VerificationFindFirstArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereInputSchema.optional(), 
  orderBy: z.union([ VerificationOrderByWithRelationInputSchema.array(), VerificationOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const VerificationFindFirstOrThrowArgsSchema: z.ZodType<Prisma.VerificationFindFirstOrThrowArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereInputSchema.optional(), 
  orderBy: z.union([ VerificationOrderByWithRelationInputSchema.array(), VerificationOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const VerificationFindManyArgsSchema: z.ZodType<Prisma.VerificationFindManyArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereInputSchema.optional(), 
  orderBy: z.union([ VerificationOrderByWithRelationInputSchema.array(), VerificationOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationScalarFieldEnumSchema, VerificationScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const VerificationAggregateArgsSchema: z.ZodType<Prisma.VerificationAggregateArgs> = z.object({
  where: VerificationWhereInputSchema.optional(), 
  orderBy: z.union([ VerificationOrderByWithRelationInputSchema.array(), VerificationOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const VerificationGroupByArgsSchema: z.ZodType<Prisma.VerificationGroupByArgs> = z.object({
  where: VerificationWhereInputSchema.optional(), 
  orderBy: z.union([ VerificationOrderByWithAggregationInputSchema.array(), VerificationOrderByWithAggregationInputSchema ]).optional(),
  by: VerificationScalarFieldEnumSchema.array(), 
  having: VerificationScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const VerificationFindUniqueArgsSchema: z.ZodType<Prisma.VerificationFindUniqueArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereUniqueInputSchema, 
}).strict();

export const VerificationFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.VerificationFindUniqueOrThrowArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereUniqueInputSchema, 
}).strict();

export const AccountCreateArgsSchema: z.ZodType<Prisma.AccountCreateArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  data: z.union([ AccountCreateInputSchema, AccountUncheckedCreateInputSchema ]),
}).strict();

export const AccountUpsertArgsSchema: z.ZodType<Prisma.AccountUpsertArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema, 
  create: z.union([ AccountCreateInputSchema, AccountUncheckedCreateInputSchema ]),
  update: z.union([ AccountUpdateInputSchema, AccountUncheckedUpdateInputSchema ]),
}).strict();

export const AccountCreateManyArgsSchema: z.ZodType<Prisma.AccountCreateManyArgs> = z.object({
  data: z.union([ AccountCreateManyInputSchema, AccountCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AccountCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AccountCreateManyAndReturnArgs> = z.object({
  data: z.union([ AccountCreateManyInputSchema, AccountCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AccountDeleteArgsSchema: z.ZodType<Prisma.AccountDeleteArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema, 
}).strict();

export const AccountUpdateArgsSchema: z.ZodType<Prisma.AccountUpdateArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  data: z.union([ AccountUpdateInputSchema, AccountUncheckedUpdateInputSchema ]),
  where: AccountWhereUniqueInputSchema, 
}).strict();

export const AccountUpdateManyArgsSchema: z.ZodType<Prisma.AccountUpdateManyArgs> = z.object({
  data: z.union([ AccountUpdateManyMutationInputSchema, AccountUncheckedUpdateManyInputSchema ]),
  where: AccountWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AccountUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AccountUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AccountUpdateManyMutationInputSchema, AccountUncheckedUpdateManyInputSchema ]),
  where: AccountWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AccountDeleteManyArgsSchema: z.ZodType<Prisma.AccountDeleteManyArgs> = z.object({
  where: AccountWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AdminPermissionCreateArgsSchema: z.ZodType<Prisma.AdminPermissionCreateArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  data: z.union([ AdminPermissionCreateInputSchema, AdminPermissionUncheckedCreateInputSchema ]),
}).strict();

export const AdminPermissionUpsertArgsSchema: z.ZodType<Prisma.AdminPermissionUpsertArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereUniqueInputSchema, 
  create: z.union([ AdminPermissionCreateInputSchema, AdminPermissionUncheckedCreateInputSchema ]),
  update: z.union([ AdminPermissionUpdateInputSchema, AdminPermissionUncheckedUpdateInputSchema ]),
}).strict();

export const AdminPermissionCreateManyArgsSchema: z.ZodType<Prisma.AdminPermissionCreateManyArgs> = z.object({
  data: z.union([ AdminPermissionCreateManyInputSchema, AdminPermissionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AdminPermissionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AdminPermissionCreateManyAndReturnArgs> = z.object({
  data: z.union([ AdminPermissionCreateManyInputSchema, AdminPermissionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AdminPermissionDeleteArgsSchema: z.ZodType<Prisma.AdminPermissionDeleteArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  where: AdminPermissionWhereUniqueInputSchema, 
}).strict();

export const AdminPermissionUpdateArgsSchema: z.ZodType<Prisma.AdminPermissionUpdateArgs> = z.object({
  select: AdminPermissionSelectSchema.optional(),
  include: AdminPermissionIncludeSchema.optional(),
  data: z.union([ AdminPermissionUpdateInputSchema, AdminPermissionUncheckedUpdateInputSchema ]),
  where: AdminPermissionWhereUniqueInputSchema, 
}).strict();

export const AdminPermissionUpdateManyArgsSchema: z.ZodType<Prisma.AdminPermissionUpdateManyArgs> = z.object({
  data: z.union([ AdminPermissionUpdateManyMutationInputSchema, AdminPermissionUncheckedUpdateManyInputSchema ]),
  where: AdminPermissionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AdminPermissionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AdminPermissionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AdminPermissionUpdateManyMutationInputSchema, AdminPermissionUncheckedUpdateManyInputSchema ]),
  where: AdminPermissionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AdminPermissionDeleteManyArgsSchema: z.ZodType<Prisma.AdminPermissionDeleteManyArgs> = z.object({
  where: AdminPermissionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AuditLogCreateArgsSchema: z.ZodType<Prisma.AuditLogCreateArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  data: z.union([ AuditLogCreateInputSchema, AuditLogUncheckedCreateInputSchema ]),
}).strict();

export const AuditLogUpsertArgsSchema: z.ZodType<Prisma.AuditLogUpsertArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereUniqueInputSchema, 
  create: z.union([ AuditLogCreateInputSchema, AuditLogUncheckedCreateInputSchema ]),
  update: z.union([ AuditLogUpdateInputSchema, AuditLogUncheckedUpdateInputSchema ]),
}).strict();

export const AuditLogCreateManyArgsSchema: z.ZodType<Prisma.AuditLogCreateManyArgs> = z.object({
  data: z.union([ AuditLogCreateManyInputSchema, AuditLogCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AuditLogCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AuditLogCreateManyAndReturnArgs> = z.object({
  data: z.union([ AuditLogCreateManyInputSchema, AuditLogCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const AuditLogDeleteArgsSchema: z.ZodType<Prisma.AuditLogDeleteArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  where: AuditLogWhereUniqueInputSchema, 
}).strict();

export const AuditLogUpdateArgsSchema: z.ZodType<Prisma.AuditLogUpdateArgs> = z.object({
  select: AuditLogSelectSchema.optional(),
  include: AuditLogIncludeSchema.optional(),
  data: z.union([ AuditLogUpdateInputSchema, AuditLogUncheckedUpdateInputSchema ]),
  where: AuditLogWhereUniqueInputSchema, 
}).strict();

export const AuditLogUpdateManyArgsSchema: z.ZodType<Prisma.AuditLogUpdateManyArgs> = z.object({
  data: z.union([ AuditLogUpdateManyMutationInputSchema, AuditLogUncheckedUpdateManyInputSchema ]),
  where: AuditLogWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AuditLogUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.AuditLogUpdateManyAndReturnArgs> = z.object({
  data: z.union([ AuditLogUpdateManyMutationInputSchema, AuditLogUncheckedUpdateManyInputSchema ]),
  where: AuditLogWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const AuditLogDeleteManyArgsSchema: z.ZodType<Prisma.AuditLogDeleteManyArgs> = z.object({
  where: AuditLogWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ClientCreateArgsSchema: z.ZodType<Prisma.ClientCreateArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  data: z.union([ ClientCreateInputSchema, ClientUncheckedCreateInputSchema ]),
}).strict();

export const ClientUpsertArgsSchema: z.ZodType<Prisma.ClientUpsertArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereUniqueInputSchema, 
  create: z.union([ ClientCreateInputSchema, ClientUncheckedCreateInputSchema ]),
  update: z.union([ ClientUpdateInputSchema, ClientUncheckedUpdateInputSchema ]),
}).strict();

export const ClientCreateManyArgsSchema: z.ZodType<Prisma.ClientCreateManyArgs> = z.object({
  data: z.union([ ClientCreateManyInputSchema, ClientCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ClientCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ClientCreateManyAndReturnArgs> = z.object({
  data: z.union([ ClientCreateManyInputSchema, ClientCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ClientDeleteArgsSchema: z.ZodType<Prisma.ClientDeleteArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  where: ClientWhereUniqueInputSchema, 
}).strict();

export const ClientUpdateArgsSchema: z.ZodType<Prisma.ClientUpdateArgs> = z.object({
  select: ClientSelectSchema.optional(),
  include: ClientIncludeSchema.optional(),
  data: z.union([ ClientUpdateInputSchema, ClientUncheckedUpdateInputSchema ]),
  where: ClientWhereUniqueInputSchema, 
}).strict();

export const ClientUpdateManyArgsSchema: z.ZodType<Prisma.ClientUpdateManyArgs> = z.object({
  data: z.union([ ClientUpdateManyMutationInputSchema, ClientUncheckedUpdateManyInputSchema ]),
  where: ClientWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ClientUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ClientUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ClientUpdateManyMutationInputSchema, ClientUncheckedUpdateManyInputSchema ]),
  where: ClientWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ClientDeleteManyArgsSchema: z.ZodType<Prisma.ClientDeleteManyArgs> = z.object({
  where: ClientWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DocumentCreateArgsSchema: z.ZodType<Prisma.DocumentCreateArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  data: z.union([ DocumentCreateInputSchema, DocumentUncheckedCreateInputSchema ]),
}).strict();

export const DocumentUpsertArgsSchema: z.ZodType<Prisma.DocumentUpsertArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereUniqueInputSchema, 
  create: z.union([ DocumentCreateInputSchema, DocumentUncheckedCreateInputSchema ]),
  update: z.union([ DocumentUpdateInputSchema, DocumentUncheckedUpdateInputSchema ]),
}).strict();

export const DocumentCreateManyArgsSchema: z.ZodType<Prisma.DocumentCreateManyArgs> = z.object({
  data: z.union([ DocumentCreateManyInputSchema, DocumentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const DocumentCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DocumentCreateManyAndReturnArgs> = z.object({
  data: z.union([ DocumentCreateManyInputSchema, DocumentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const DocumentDeleteArgsSchema: z.ZodType<Prisma.DocumentDeleteArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  where: DocumentWhereUniqueInputSchema, 
}).strict();

export const DocumentUpdateArgsSchema: z.ZodType<Prisma.DocumentUpdateArgs> = z.object({
  select: DocumentSelectSchema.optional(),
  include: DocumentIncludeSchema.optional(),
  data: z.union([ DocumentUpdateInputSchema, DocumentUncheckedUpdateInputSchema ]),
  where: DocumentWhereUniqueInputSchema, 
}).strict();

export const DocumentUpdateManyArgsSchema: z.ZodType<Prisma.DocumentUpdateManyArgs> = z.object({
  data: z.union([ DocumentUpdateManyMutationInputSchema, DocumentUncheckedUpdateManyInputSchema ]),
  where: DocumentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DocumentUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DocumentUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DocumentUpdateManyMutationInputSchema, DocumentUncheckedUpdateManyInputSchema ]),
  where: DocumentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const DocumentDeleteManyArgsSchema: z.ZodType<Prisma.DocumentDeleteManyArgs> = z.object({
  where: DocumentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const MediaCreateArgsSchema: z.ZodType<Prisma.MediaCreateArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  data: z.union([ MediaCreateInputSchema, MediaUncheckedCreateInputSchema ]),
}).strict();

export const MediaUpsertArgsSchema: z.ZodType<Prisma.MediaUpsertArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereUniqueInputSchema, 
  create: z.union([ MediaCreateInputSchema, MediaUncheckedCreateInputSchema ]),
  update: z.union([ MediaUpdateInputSchema, MediaUncheckedUpdateInputSchema ]),
}).strict();

export const MediaCreateManyArgsSchema: z.ZodType<Prisma.MediaCreateManyArgs> = z.object({
  data: z.union([ MediaCreateManyInputSchema, MediaCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const MediaCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MediaCreateManyAndReturnArgs> = z.object({
  data: z.union([ MediaCreateManyInputSchema, MediaCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const MediaDeleteArgsSchema: z.ZodType<Prisma.MediaDeleteArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  where: MediaWhereUniqueInputSchema, 
}).strict();

export const MediaUpdateArgsSchema: z.ZodType<Prisma.MediaUpdateArgs> = z.object({
  select: MediaSelectSchema.optional(),
  include: MediaIncludeSchema.optional(),
  data: z.union([ MediaUpdateInputSchema, MediaUncheckedUpdateInputSchema ]),
  where: MediaWhereUniqueInputSchema, 
}).strict();

export const MediaUpdateManyArgsSchema: z.ZodType<Prisma.MediaUpdateManyArgs> = z.object({
  data: z.union([ MediaUpdateManyMutationInputSchema, MediaUncheckedUpdateManyInputSchema ]),
  where: MediaWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const MediaUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.MediaUpdateManyAndReturnArgs> = z.object({
  data: z.union([ MediaUpdateManyMutationInputSchema, MediaUncheckedUpdateManyInputSchema ]),
  where: MediaWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const MediaDeleteManyArgsSchema: z.ZodType<Prisma.MediaDeleteManyArgs> = z.object({
  where: MediaWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentCreateArgsSchema: z.ZodType<Prisma.PaymentCreateArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  data: z.union([ PaymentCreateInputSchema, PaymentUncheckedCreateInputSchema ]),
}).strict();

export const PaymentUpsertArgsSchema: z.ZodType<Prisma.PaymentUpsertArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereUniqueInputSchema, 
  create: z.union([ PaymentCreateInputSchema, PaymentUncheckedCreateInputSchema ]),
  update: z.union([ PaymentUpdateInputSchema, PaymentUncheckedUpdateInputSchema ]),
}).strict();

export const PaymentCreateManyArgsSchema: z.ZodType<Prisma.PaymentCreateManyArgs> = z.object({
  data: z.union([ PaymentCreateManyInputSchema, PaymentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const PaymentCreateManyAndReturnArgsSchema: z.ZodType<Prisma.PaymentCreateManyAndReturnArgs> = z.object({
  data: z.union([ PaymentCreateManyInputSchema, PaymentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const PaymentDeleteArgsSchema: z.ZodType<Prisma.PaymentDeleteArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  where: PaymentWhereUniqueInputSchema, 
}).strict();

export const PaymentUpdateArgsSchema: z.ZodType<Prisma.PaymentUpdateArgs> = z.object({
  select: PaymentSelectSchema.optional(),
  include: PaymentIncludeSchema.optional(),
  data: z.union([ PaymentUpdateInputSchema, PaymentUncheckedUpdateInputSchema ]),
  where: PaymentWhereUniqueInputSchema, 
}).strict();

export const PaymentUpdateManyArgsSchema: z.ZodType<Prisma.PaymentUpdateManyArgs> = z.object({
  data: z.union([ PaymentUpdateManyMutationInputSchema, PaymentUncheckedUpdateManyInputSchema ]),
  where: PaymentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.PaymentUpdateManyAndReturnArgs> = z.object({
  data: z.union([ PaymentUpdateManyMutationInputSchema, PaymentUncheckedUpdateManyInputSchema ]),
  where: PaymentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentDeleteManyArgsSchema: z.ZodType<Prisma.PaymentDeleteManyArgs> = z.object({
  where: PaymentWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ProviderCreateArgsSchema: z.ZodType<Prisma.ProviderCreateArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  data: z.union([ ProviderCreateInputSchema, ProviderUncheckedCreateInputSchema ]),
}).strict();

export const ProviderUpsertArgsSchema: z.ZodType<Prisma.ProviderUpsertArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereUniqueInputSchema, 
  create: z.union([ ProviderCreateInputSchema, ProviderUncheckedCreateInputSchema ]),
  update: z.union([ ProviderUpdateInputSchema, ProviderUncheckedUpdateInputSchema ]),
}).strict();

export const ProviderCreateManyArgsSchema: z.ZodType<Prisma.ProviderCreateManyArgs> = z.object({
  data: z.union([ ProviderCreateManyInputSchema, ProviderCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ProviderCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ProviderCreateManyAndReturnArgs> = z.object({
  data: z.union([ ProviderCreateManyInputSchema, ProviderCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ProviderDeleteArgsSchema: z.ZodType<Prisma.ProviderDeleteArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  where: ProviderWhereUniqueInputSchema, 
}).strict();

export const ProviderUpdateArgsSchema: z.ZodType<Prisma.ProviderUpdateArgs> = z.object({
  select: ProviderSelectSchema.optional(),
  include: ProviderIncludeSchema.optional(),
  data: z.union([ ProviderUpdateInputSchema, ProviderUncheckedUpdateInputSchema ]),
  where: ProviderWhereUniqueInputSchema, 
}).strict();

export const ProviderUpdateManyArgsSchema: z.ZodType<Prisma.ProviderUpdateManyArgs> = z.object({
  data: z.union([ ProviderUpdateManyMutationInputSchema, ProviderUncheckedUpdateManyInputSchema ]),
  where: ProviderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ProviderUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ProviderUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ProviderUpdateManyMutationInputSchema, ProviderUncheckedUpdateManyInputSchema ]),
  where: ProviderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ProviderDeleteManyArgsSchema: z.ZodType<Prisma.ProviderDeleteManyArgs> = z.object({
  where: ProviderWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SessionCreateArgsSchema: z.ZodType<Prisma.SessionCreateArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  data: z.union([ SessionCreateInputSchema, SessionUncheckedCreateInputSchema ]),
}).strict();

export const SessionUpsertArgsSchema: z.ZodType<Prisma.SessionUpsertArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema, 
  create: z.union([ SessionCreateInputSchema, SessionUncheckedCreateInputSchema ]),
  update: z.union([ SessionUpdateInputSchema, SessionUncheckedUpdateInputSchema ]),
}).strict();

export const SessionCreateManyArgsSchema: z.ZodType<Prisma.SessionCreateManyArgs> = z.object({
  data: z.union([ SessionCreateManyInputSchema, SessionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SessionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SessionCreateManyAndReturnArgs> = z.object({
  data: z.union([ SessionCreateManyInputSchema, SessionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SessionDeleteArgsSchema: z.ZodType<Prisma.SessionDeleteArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema, 
}).strict();

export const SessionUpdateArgsSchema: z.ZodType<Prisma.SessionUpdateArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  data: z.union([ SessionUpdateInputSchema, SessionUncheckedUpdateInputSchema ]),
  where: SessionWhereUniqueInputSchema, 
}).strict();

export const SessionUpdateManyArgsSchema: z.ZodType<Prisma.SessionUpdateManyArgs> = z.object({
  data: z.union([ SessionUpdateManyMutationInputSchema, SessionUncheckedUpdateManyInputSchema ]),
  where: SessionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SessionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.SessionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ SessionUpdateManyMutationInputSchema, SessionUncheckedUpdateManyInputSchema ]),
  where: SessionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SessionDeleteManyArgsSchema: z.ZodType<Prisma.SessionDeleteManyArgs> = z.object({
  where: SessionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SettingsCreateArgsSchema: z.ZodType<Prisma.SettingsCreateArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  data: z.union([ SettingsCreateInputSchema, SettingsUncheckedCreateInputSchema ]),
}).strict();

export const SettingsUpsertArgsSchema: z.ZodType<Prisma.SettingsUpsertArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereUniqueInputSchema, 
  create: z.union([ SettingsCreateInputSchema, SettingsUncheckedCreateInputSchema ]),
  update: z.union([ SettingsUpdateInputSchema, SettingsUncheckedUpdateInputSchema ]),
}).strict();

export const SettingsCreateManyArgsSchema: z.ZodType<Prisma.SettingsCreateManyArgs> = z.object({
  data: z.union([ SettingsCreateManyInputSchema, SettingsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SettingsCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SettingsCreateManyAndReturnArgs> = z.object({
  data: z.union([ SettingsCreateManyInputSchema, SettingsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SettingsDeleteArgsSchema: z.ZodType<Prisma.SettingsDeleteArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  where: SettingsWhereUniqueInputSchema, 
}).strict();

export const SettingsUpdateArgsSchema: z.ZodType<Prisma.SettingsUpdateArgs> = z.object({
  select: SettingsSelectSchema.optional(),
  data: z.union([ SettingsUpdateInputSchema, SettingsUncheckedUpdateInputSchema ]),
  where: SettingsWhereUniqueInputSchema, 
}).strict();

export const SettingsUpdateManyArgsSchema: z.ZodType<Prisma.SettingsUpdateManyArgs> = z.object({
  data: z.union([ SettingsUpdateManyMutationInputSchema, SettingsUncheckedUpdateManyInputSchema ]),
  where: SettingsWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SettingsUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.SettingsUpdateManyAndReturnArgs> = z.object({
  data: z.union([ SettingsUpdateManyMutationInputSchema, SettingsUncheckedUpdateManyInputSchema ]),
  where: SettingsWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SettingsDeleteManyArgsSchema: z.ZodType<Prisma.SettingsDeleteManyArgs> = z.object({
  where: SettingsWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserCreateInputSchema, UserUncheckedCreateInputSchema ]),
}).strict();

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
  create: z.union([ UserCreateInputSchema, UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema, UserUncheckedUpdateInputSchema ]),
}).strict();

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema, UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema, UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserUpdateInputSchema, UserUncheckedUpdateInputSchema ]),
  where: UserWhereUniqueInputSchema, 
}).strict();

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema, UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema, UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z.object({
  where: UserWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const VerificationCreateArgsSchema: z.ZodType<Prisma.VerificationCreateArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  data: z.union([ VerificationCreateInputSchema, VerificationUncheckedCreateInputSchema ]),
}).strict();

export const VerificationUpsertArgsSchema: z.ZodType<Prisma.VerificationUpsertArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereUniqueInputSchema, 
  create: z.union([ VerificationCreateInputSchema, VerificationUncheckedCreateInputSchema ]),
  update: z.union([ VerificationUpdateInputSchema, VerificationUncheckedUpdateInputSchema ]),
}).strict();

export const VerificationCreateManyArgsSchema: z.ZodType<Prisma.VerificationCreateManyArgs> = z.object({
  data: z.union([ VerificationCreateManyInputSchema, VerificationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const VerificationCreateManyAndReturnArgsSchema: z.ZodType<Prisma.VerificationCreateManyAndReturnArgs> = z.object({
  data: z.union([ VerificationCreateManyInputSchema, VerificationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const VerificationDeleteArgsSchema: z.ZodType<Prisma.VerificationDeleteArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  where: VerificationWhereUniqueInputSchema, 
}).strict();

export const VerificationUpdateArgsSchema: z.ZodType<Prisma.VerificationUpdateArgs> = z.object({
  select: VerificationSelectSchema.optional(),
  data: z.union([ VerificationUpdateInputSchema, VerificationUncheckedUpdateInputSchema ]),
  where: VerificationWhereUniqueInputSchema, 
}).strict();

export const VerificationUpdateManyArgsSchema: z.ZodType<Prisma.VerificationUpdateManyArgs> = z.object({
  data: z.union([ VerificationUpdateManyMutationInputSchema, VerificationUncheckedUpdateManyInputSchema ]),
  where: VerificationWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const VerificationUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.VerificationUpdateManyAndReturnArgs> = z.object({
  data: z.union([ VerificationUpdateManyMutationInputSchema, VerificationUncheckedUpdateManyInputSchema ]),
  where: VerificationWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const VerificationDeleteManyArgsSchema: z.ZodType<Prisma.VerificationDeleteManyArgs> = z.object({
  where: VerificationWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();