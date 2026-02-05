import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const AccountScalarFieldEnumSchema = z.enum(['id','userId','accountId','providerId','accessToken','refreshToken','accessTokenExpiresAt','refreshTokenExpiresAt','scope','idToken','password','createdAt','updatedAt']);

export const ContactScalarFieldEnumSchema = z.enum(['id','email','firstName','lastName','createdAt']);

export const MediaScalarFieldEnumSchema = z.enum(['id','url','key','mimeType','size','avatarUserId','coverUserId','messageId','createdAt']);

export const MessageScalarFieldEnumSchema = z.enum(['id','text','createdAt','userId','roomId']);

export const RoomScalarFieldEnumSchema = z.enum(['id','name','isGroup','createdAt','updatedAt']);

export const RoomParticipantScalarFieldEnumSchema = z.enum(['id','userId','roomId','joinedAt']);

export const SessionScalarFieldEnumSchema = z.enum(['id','userId','token','expiresAt','ipAddress','userAgent','createdAt','updatedAt']);

export const SubscriptionScalarFieldEnumSchema = z.enum(['id','userId','stripeCustomerId','stripeSubscriptionId','status','planId','currentPeriodEnd','cancelAtPeriodEnd','createdAt','updatedAt']);

export const PaymentHistoryScalarFieldEnumSchema = z.enum(['id','userId','stripePaymentId','amount','currency','status','createdAt']);

export const UserScalarFieldEnumSchema = z.enum(['id','email','firstName','lastName','password','emailVerified','role','isPremium','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','hashedIdentifier','hashedValue','expiresAt','createdAt','updatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const UserRoleSchema = z.enum(['USER','ADMIN']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

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
// CONTACT SCHEMA
/////////////////////////////////////////

export const ContactSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.coerce.date(),
})

export type Contact = z.infer<typeof ContactSchema>

/////////////////////////////////////////
// MEDIA SCHEMA
/////////////////////////////////////////

export const MediaSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  avatarUserId: z.string().nullable(),
  coverUserId: z.string().nullable(),
  messageId: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type Media = z.infer<typeof MediaSchema>

// MEDIA RELATION SCHEMA
//------------------------------------------------------

export type MediaRelations = {
  avatarUser?: UserWithRelations | null;
  coverUser?: UserWithRelations | null;
  message?: MessageWithRelations | null;
};

export type MediaWithRelations = z.infer<typeof MediaSchema> & MediaRelations

export const MediaWithRelationsSchema: z.ZodType<MediaWithRelations> = MediaSchema.merge(z.object({
  avatarUser: z.lazy(() => UserWithRelationsSchema).nullable(),
  coverUser: z.lazy(() => UserWithRelationsSchema).nullable(),
  message: z.lazy(() => MessageWithRelationsSchema).nullable(),
}))

/////////////////////////////////////////
// MESSAGE SCHEMA
/////////////////////////////////////////

export const MessageSchema = z.object({
  id: z.cuid(),
  text: z.string().nullable(),
  createdAt: z.coerce.date(),
  userId: z.string(),
  roomId: z.string(),
})

export type Message = z.infer<typeof MessageSchema>

// MESSAGE RELATION SCHEMA
//------------------------------------------------------

export type MessageRelations = {
  user: UserWithRelations;
  room: RoomWithRelations;
  attachments: MediaWithRelations[];
};

export type MessageWithRelations = z.infer<typeof MessageSchema> & MessageRelations

export const MessageWithRelationsSchema: z.ZodType<MessageWithRelations> = MessageSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
  room: z.lazy(() => RoomWithRelationsSchema),
  attachments: z.lazy(() => MediaWithRelationsSchema).array(),
}))

/////////////////////////////////////////
// ROOM SCHEMA
/////////////////////////////////////////

export const RoomSchema = z.object({
  id: z.cuid(),
  name: z.string().nullable(),
  isGroup: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Room = z.infer<typeof RoomSchema>

// ROOM RELATION SCHEMA
//------------------------------------------------------

export type RoomRelations = {
  messages: MessageWithRelations[];
  participants: RoomParticipantWithRelations[];
};

export type RoomWithRelations = z.infer<typeof RoomSchema> & RoomRelations

export const RoomWithRelationsSchema: z.ZodType<RoomWithRelations> = RoomSchema.merge(z.object({
  messages: z.lazy(() => MessageWithRelationsSchema).array(),
  participants: z.lazy(() => RoomParticipantWithRelationsSchema).array(),
}))

/////////////////////////////////////////
// ROOM PARTICIPANT SCHEMA
/////////////////////////////////////////

export const RoomParticipantSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  roomId: z.string(),
  joinedAt: z.coerce.date(),
})

export type RoomParticipant = z.infer<typeof RoomParticipantSchema>

// ROOM PARTICIPANT RELATION SCHEMA
//------------------------------------------------------

export type RoomParticipantRelations = {
  user: UserWithRelations;
  room: RoomWithRelations;
};

export type RoomParticipantWithRelations = z.infer<typeof RoomParticipantSchema> & RoomParticipantRelations

export const RoomParticipantWithRelationsSchema: z.ZodType<RoomParticipantWithRelations> = RoomParticipantSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
  room: z.lazy(() => RoomWithRelationsSchema),
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
// SUBSCRIPTION SCHEMA
/////////////////////////////////////////

export const SubscriptionSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().nullable(),
  status: z.string(),
  planId: z.string().nullable(),
  currentPeriodEnd: z.coerce.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Subscription = z.infer<typeof SubscriptionSchema>

// SUBSCRIPTION RELATION SCHEMA
//------------------------------------------------------

export type SubscriptionRelations = {
  user: UserWithRelations;
};

export type SubscriptionWithRelations = z.infer<typeof SubscriptionSchema> & SubscriptionRelations

export const SubscriptionWithRelationsSchema: z.ZodType<SubscriptionWithRelations> = SubscriptionSchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// PAYMENT HISTORY SCHEMA
/////////////////////////////////////////

export const PaymentHistorySchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  stripePaymentId: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
})

export type PaymentHistory = z.infer<typeof PaymentHistorySchema>

// PAYMENT HISTORY RELATION SCHEMA
//------------------------------------------------------

export type PaymentHistoryRelations = {
  user: UserWithRelations;
};

export type PaymentHistoryWithRelations = z.infer<typeof PaymentHistorySchema> & PaymentHistoryRelations

export const PaymentHistoryWithRelationsSchema: z.ZodType<PaymentHistoryWithRelations> = PaymentHistorySchema.merge(z.object({
  user: z.lazy(() => UserWithRelationsSchema),
}))

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  role: UserRoleSchema,
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean(),
  isPremium: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

// USER RELATION SCHEMA
//------------------------------------------------------

export type UserRelations = {
  avatar?: MediaWithRelations | null;
  coverImage?: MediaWithRelations | null;
  messages: MessageWithRelations[];
  rooms: RoomParticipantWithRelations[];
  sessions: SessionWithRelations[];
  accounts: AccountWithRelations[];
  subscription?: SubscriptionWithRelations | null;
  paymentHistory: PaymentHistoryWithRelations[];
};

export type UserWithRelations = z.infer<typeof UserSchema> & UserRelations

export const UserWithRelationsSchema: z.ZodType<UserWithRelations> = UserSchema.merge(z.object({
  avatar: z.lazy(() => MediaWithRelationsSchema).nullable(),
  coverImage: z.lazy(() => MediaWithRelationsSchema).nullable(),
  messages: z.lazy(() => MessageWithRelationsSchema).array(),
  rooms: z.lazy(() => RoomParticipantWithRelationsSchema).array(),
  sessions: z.lazy(() => SessionWithRelationsSchema).array(),
  accounts: z.lazy(() => AccountWithRelationsSchema).array(),
  subscription: z.lazy(() => SubscriptionWithRelationsSchema).nullable(),
  paymentHistory: z.lazy(() => PaymentHistoryWithRelationsSchema).array(),
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

// CONTACT
//------------------------------------------------------

export const ContactSelectSchema: z.ZodType<Prisma.ContactSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  firstName: z.boolean().optional(),
  lastName: z.boolean().optional(),
  createdAt: z.boolean().optional(),
}).strict()

// MEDIA
//------------------------------------------------------

export const MediaIncludeSchema: z.ZodType<Prisma.MediaInclude> = z.object({
  avatarUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  coverUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  message: z.union([z.boolean(),z.lazy(() => MessageArgsSchema)]).optional(),
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
  messageId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  avatarUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  coverUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  message: z.union([z.boolean(),z.lazy(() => MessageArgsSchema)]).optional(),
}).strict()

// MESSAGE
//------------------------------------------------------

export const MessageIncludeSchema: z.ZodType<Prisma.MessageInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  room: z.union([z.boolean(),z.lazy(() => RoomArgsSchema)]).optional(),
  attachments: z.union([z.boolean(),z.lazy(() => MediaFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MessageCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const MessageArgsSchema: z.ZodType<Prisma.MessageDefaultArgs> = z.object({
  select: z.lazy(() => MessageSelectSchema).optional(),
  include: z.lazy(() => MessageIncludeSchema).optional(),
}).strict();

export const MessageCountOutputTypeArgsSchema: z.ZodType<Prisma.MessageCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => MessageCountOutputTypeSelectSchema).nullish(),
}).strict();

export const MessageCountOutputTypeSelectSchema: z.ZodType<Prisma.MessageCountOutputTypeSelect> = z.object({
  attachments: z.boolean().optional(),
}).strict();

export const MessageSelectSchema: z.ZodType<Prisma.MessageSelect> = z.object({
  id: z.boolean().optional(),
  text: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  userId: z.boolean().optional(),
  roomId: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  room: z.union([z.boolean(),z.lazy(() => RoomArgsSchema)]).optional(),
  attachments: z.union([z.boolean(),z.lazy(() => MediaFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MessageCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ROOM
//------------------------------------------------------

export const RoomIncludeSchema: z.ZodType<Prisma.RoomInclude> = z.object({
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  participants: z.union([z.boolean(),z.lazy(() => RoomParticipantFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => RoomCountOutputTypeArgsSchema)]).optional(),
}).strict();

export const RoomArgsSchema: z.ZodType<Prisma.RoomDefaultArgs> = z.object({
  select: z.lazy(() => RoomSelectSchema).optional(),
  include: z.lazy(() => RoomIncludeSchema).optional(),
}).strict();

export const RoomCountOutputTypeArgsSchema: z.ZodType<Prisma.RoomCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => RoomCountOutputTypeSelectSchema).nullish(),
}).strict();

export const RoomCountOutputTypeSelectSchema: z.ZodType<Prisma.RoomCountOutputTypeSelect> = z.object({
  messages: z.boolean().optional(),
  participants: z.boolean().optional(),
}).strict();

export const RoomSelectSchema: z.ZodType<Prisma.RoomSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  participants: z.union([z.boolean(),z.lazy(() => RoomParticipantFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => RoomCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ROOM PARTICIPANT
//------------------------------------------------------

export const RoomParticipantIncludeSchema: z.ZodType<Prisma.RoomParticipantInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  room: z.union([z.boolean(),z.lazy(() => RoomArgsSchema)]).optional(),
}).strict();

export const RoomParticipantArgsSchema: z.ZodType<Prisma.RoomParticipantDefaultArgs> = z.object({
  select: z.lazy(() => RoomParticipantSelectSchema).optional(),
  include: z.lazy(() => RoomParticipantIncludeSchema).optional(),
}).strict();

export const RoomParticipantSelectSchema: z.ZodType<Prisma.RoomParticipantSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  roomId: z.boolean().optional(),
  joinedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  room: z.union([z.boolean(),z.lazy(() => RoomArgsSchema)]).optional(),
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

// SUBSCRIPTION
//------------------------------------------------------

export const SubscriptionIncludeSchema: z.ZodType<Prisma.SubscriptionInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const SubscriptionArgsSchema: z.ZodType<Prisma.SubscriptionDefaultArgs> = z.object({
  select: z.lazy(() => SubscriptionSelectSchema).optional(),
  include: z.lazy(() => SubscriptionIncludeSchema).optional(),
}).strict();

export const SubscriptionSelectSchema: z.ZodType<Prisma.SubscriptionSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  stripeCustomerId: z.boolean().optional(),
  stripeSubscriptionId: z.boolean().optional(),
  status: z.boolean().optional(),
  planId: z.boolean().optional(),
  currentPeriodEnd: z.boolean().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// PAYMENT HISTORY
//------------------------------------------------------

export const PaymentHistoryIncludeSchema: z.ZodType<Prisma.PaymentHistoryInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict();

export const PaymentHistoryArgsSchema: z.ZodType<Prisma.PaymentHistoryDefaultArgs> = z.object({
  select: z.lazy(() => PaymentHistorySelectSchema).optional(),
  include: z.lazy(() => PaymentHistoryIncludeSchema).optional(),
}).strict();

export const PaymentHistorySelectSchema: z.ZodType<Prisma.PaymentHistorySelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  stripePaymentId: z.boolean().optional(),
  amount: z.boolean().optional(),
  currency: z.boolean().optional(),
  status: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  avatar: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  coverImage: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  rooms: z.union([z.boolean(),z.lazy(() => RoomParticipantFindManyArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  subscription: z.union([z.boolean(),z.lazy(() => SubscriptionArgsSchema)]).optional(),
  paymentHistory: z.union([z.boolean(),z.lazy(() => PaymentHistoryFindManyArgsSchema)]).optional(),
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
  messages: z.boolean().optional(),
  rooms: z.boolean().optional(),
  sessions: z.boolean().optional(),
  accounts: z.boolean().optional(),
  paymentHistory: z.boolean().optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  firstName: z.boolean().optional(),
  lastName: z.boolean().optional(),
  password: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  role: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  avatar: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  coverImage: z.union([z.boolean(),z.lazy(() => MediaArgsSchema)]).optional(),
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  rooms: z.union([z.boolean(),z.lazy(() => RoomParticipantFindManyArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  subscription: z.union([z.boolean(),z.lazy(() => SubscriptionArgsSchema)]).optional(),
  paymentHistory: z.union([z.boolean(),z.lazy(() => PaymentHistoryFindManyArgsSchema)]).optional(),
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

export const AccountWhereInputSchema: z.ZodType<Prisma.AccountWhereInput> = z.strictObject({
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
});

export const AccountOrderByWithRelationInputSchema: z.ZodType<Prisma.AccountOrderByWithRelationInput> = z.strictObject({
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
});

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
.and(z.strictObject({
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
}));

export const AccountOrderByWithAggregationInputSchema: z.ZodType<Prisma.AccountOrderByWithAggregationInput> = z.strictObject({
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
});

export const AccountScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AccountScalarWhereWithAggregatesInput> = z.strictObject({
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
});

export const ContactWhereInputSchema: z.ZodType<Prisma.ContactWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => ContactWhereInputSchema), z.lazy(() => ContactWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ContactWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ContactWhereInputSchema), z.lazy(() => ContactWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  firstName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
});

export const ContactOrderByWithRelationInputSchema: z.ZodType<Prisma.ContactOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const ContactWhereUniqueInputSchema: z.ZodType<Prisma.ContactWhereUniqueInput> = z.union([
  z.object({
    id: z.uuid(),
    email: z.string(),
  }),
  z.object({
    id: z.uuid(),
  }),
  z.object({
    email: z.string(),
  }),
])
.and(z.strictObject({
  id: z.uuid().optional(),
  email: z.string().optional(),
  AND: z.union([ z.lazy(() => ContactWhereInputSchema), z.lazy(() => ContactWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ContactWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ContactWhereInputSchema), z.lazy(() => ContactWhereInputSchema).array() ]).optional(),
  firstName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
}));

export const ContactOrderByWithAggregationInputSchema: z.ZodType<Prisma.ContactOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ContactCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ContactMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ContactMinOrderByAggregateInputSchema).optional(),
});

export const ContactScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ContactScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => ContactScalarWhereWithAggregatesInputSchema), z.lazy(() => ContactScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ContactScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ContactScalarWhereWithAggregatesInputSchema), z.lazy(() => ContactScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  firstName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const MediaWhereInputSchema: z.ZodType<Prisma.MediaWhereInput> = z.strictObject({
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
  messageId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatarUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  coverUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  message: z.union([ z.lazy(() => MessageNullableScalarRelationFilterSchema), z.lazy(() => MessageWhereInputSchema) ]).optional().nullable(),
});

export const MediaOrderByWithRelationInputSchema: z.ZodType<Prisma.MediaOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  coverUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  messageId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  avatarUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  coverUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  message: z.lazy(() => MessageOrderByWithRelationInputSchema).optional(),
});

export const MediaWhereUniqueInputSchema: z.ZodType<Prisma.MediaWhereUniqueInput> = z.union([
  z.object({
    id: z.uuid(),
    key: z.string(),
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
    key: z.string(),
    avatarUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
    key: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
    key: z.string(),
  }),
  z.object({
    id: z.uuid(),
    avatarUserId: z.string(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
    avatarUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
    coverUserId: z.string(),
  }),
  z.object({
    id: z.uuid(),
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
.and(z.strictObject({
  id: z.uuid().optional(),
  key: z.string().optional(),
  avatarUserId: z.string().optional(),
  coverUserId: z.string().optional(),
  AND: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MediaWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MediaWhereInputSchema), z.lazy(() => MediaWhereInputSchema).array() ]).optional(),
  url: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  size: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  messageId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatarUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  coverUser: z.union([ z.lazy(() => UserNullableScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional().nullable(),
  message: z.union([ z.lazy(() => MessageNullableScalarRelationFilterSchema), z.lazy(() => MessageWhereInputSchema) ]).optional().nullable(),
}));

export const MediaOrderByWithAggregationInputSchema: z.ZodType<Prisma.MediaOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  coverUserId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  messageId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MediaCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MediaAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MediaMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MediaMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MediaSumOrderByAggregateInputSchema).optional(),
});

export const MediaScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MediaScalarWhereWithAggregatesInput> = z.strictObject({
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
  messageId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const MessageWhereInputSchema: z.ZodType<Prisma.MessageWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => MessageWhereInputSchema), z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageWhereInputSchema), z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  text: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  room: z.union([ z.lazy(() => RoomScalarRelationFilterSchema), z.lazy(() => RoomWhereInputSchema) ]).optional(),
  attachments: z.lazy(() => MediaListRelationFilterSchema).optional(),
});

export const MessageOrderByWithRelationInputSchema: z.ZodType<Prisma.MessageOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  text: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  room: z.lazy(() => RoomOrderByWithRelationInputSchema).optional(),
  attachments: z.lazy(() => MediaOrderByRelationAggregateInputSchema).optional(),
});

export const MessageWhereUniqueInputSchema: z.ZodType<Prisma.MessageWhereUniqueInput> = z.object({
  id: z.cuid(),
})
.and(z.strictObject({
  id: z.cuid().optional(),
  AND: z.union([ z.lazy(() => MessageWhereInputSchema), z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageWhereInputSchema), z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  text: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  room: z.union([ z.lazy(() => RoomScalarRelationFilterSchema), z.lazy(() => RoomWhereInputSchema) ]).optional(),
  attachments: z.lazy(() => MediaListRelationFilterSchema).optional(),
}));

export const MessageOrderByWithAggregationInputSchema: z.ZodType<Prisma.MessageOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  text: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MessageCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MessageMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MessageMinOrderByAggregateInputSchema).optional(),
});

export const MessageScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MessageScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => MessageScalarWhereWithAggregatesInputSchema), z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageScalarWhereWithAggregatesInputSchema), z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  text: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
});

export const RoomWhereInputSchema: z.ZodType<Prisma.RoomWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => RoomWhereInputSchema), z.lazy(() => RoomWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomWhereInputSchema), z.lazy(() => RoomWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  isGroup: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  participants: z.lazy(() => RoomParticipantListRelationFilterSchema).optional(),
});

export const RoomOrderByWithRelationInputSchema: z.ZodType<Prisma.RoomOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  isGroup: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  messages: z.lazy(() => MessageOrderByRelationAggregateInputSchema).optional(),
  participants: z.lazy(() => RoomParticipantOrderByRelationAggregateInputSchema).optional(),
});

export const RoomWhereUniqueInputSchema: z.ZodType<Prisma.RoomWhereUniqueInput> = z.object({
  id: z.cuid(),
})
.and(z.strictObject({
  id: z.cuid().optional(),
  AND: z.union([ z.lazy(() => RoomWhereInputSchema), z.lazy(() => RoomWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomWhereInputSchema), z.lazy(() => RoomWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  isGroup: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  participants: z.lazy(() => RoomParticipantListRelationFilterSchema).optional(),
}));

export const RoomOrderByWithAggregationInputSchema: z.ZodType<Prisma.RoomOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  isGroup: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => RoomCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => RoomMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => RoomMinOrderByAggregateInputSchema).optional(),
});

export const RoomScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.RoomScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => RoomScalarWhereWithAggregatesInputSchema), z.lazy(() => RoomScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomScalarWhereWithAggregatesInputSchema), z.lazy(() => RoomScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  isGroup: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const RoomParticipantWhereInputSchema: z.ZodType<Prisma.RoomParticipantWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => RoomParticipantWhereInputSchema), z.lazy(() => RoomParticipantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomParticipantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomParticipantWhereInputSchema), z.lazy(() => RoomParticipantWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  joinedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  room: z.union([ z.lazy(() => RoomScalarRelationFilterSchema), z.lazy(() => RoomWhereInputSchema) ]).optional(),
});

export const RoomParticipantOrderByWithRelationInputSchema: z.ZodType<Prisma.RoomParticipantOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  joinedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  room: z.lazy(() => RoomOrderByWithRelationInputSchema).optional(),
});

export const RoomParticipantWhereUniqueInputSchema: z.ZodType<Prisma.RoomParticipantWhereUniqueInput> = z.union([
  z.object({
    id: z.cuid(),
    userId_roomId: z.lazy(() => RoomParticipantUserIdRoomIdCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.cuid(),
  }),
  z.object({
    userId_roomId: z.lazy(() => RoomParticipantUserIdRoomIdCompoundUniqueInputSchema),
  }),
])
.and(z.strictObject({
  id: z.cuid().optional(),
  userId_roomId: z.lazy(() => RoomParticipantUserIdRoomIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => RoomParticipantWhereInputSchema), z.lazy(() => RoomParticipantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomParticipantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomParticipantWhereInputSchema), z.lazy(() => RoomParticipantWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  joinedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
  room: z.union([ z.lazy(() => RoomScalarRelationFilterSchema), z.lazy(() => RoomWhereInputSchema) ]).optional(),
}));

export const RoomParticipantOrderByWithAggregationInputSchema: z.ZodType<Prisma.RoomParticipantOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  joinedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => RoomParticipantCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => RoomParticipantMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => RoomParticipantMinOrderByAggregateInputSchema).optional(),
});

export const RoomParticipantScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.RoomParticipantScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => RoomParticipantScalarWhereWithAggregatesInputSchema), z.lazy(() => RoomParticipantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomParticipantScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomParticipantScalarWhereWithAggregatesInputSchema), z.lazy(() => RoomParticipantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  joinedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const SessionWhereInputSchema: z.ZodType<Prisma.SessionWhereInput> = z.strictObject({
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
});

export const SessionOrderByWithRelationInputSchema: z.ZodType<Prisma.SessionOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  userAgent: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
});

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
.and(z.strictObject({
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
}));

export const SessionOrderByWithAggregationInputSchema: z.ZodType<Prisma.SessionOrderByWithAggregationInput> = z.strictObject({
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
});

export const SessionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SessionScalarWhereWithAggregatesInput> = z.strictObject({
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
});

export const SubscriptionWhereInputSchema: z.ZodType<Prisma.SubscriptionWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => SubscriptionWhereInputSchema), z.lazy(() => SubscriptionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SubscriptionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SubscriptionWhereInputSchema), z.lazy(() => SubscriptionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  stripeCustomerId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  status: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  planId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
});

export const SubscriptionOrderByWithRelationInputSchema: z.ZodType<Prisma.SubscriptionOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  planId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  currentPeriodEnd: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  cancelAtPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
});

export const SubscriptionWhereUniqueInputSchema: z.ZodType<Prisma.SubscriptionWhereUniqueInput> = z.union([
  z.object({
    id: z.number(),
    userId: z.string(),
    stripeCustomerId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    id: z.number(),
    userId: z.string(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    id: z.number(),
    userId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    id: z.number(),
    userId: z.string(),
  }),
  z.object({
    id: z.number(),
    stripeCustomerId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    id: z.number(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    id: z.number(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    id: z.number(),
  }),
  z.object({
    userId: z.string(),
    stripeCustomerId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    userId: z.string(),
    stripeCustomerId: z.string(),
  }),
  z.object({
    userId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    userId: z.string(),
  }),
  z.object({
    stripeCustomerId: z.string(),
    stripeSubscriptionId: z.string(),
  }),
  z.object({
    stripeCustomerId: z.string(),
  }),
  z.object({
    stripeSubscriptionId: z.string(),
  }),
])
.and(z.strictObject({
  id: z.number().optional(),
  userId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  AND: z.union([ z.lazy(() => SubscriptionWhereInputSchema), z.lazy(() => SubscriptionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SubscriptionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SubscriptionWhereInputSchema), z.lazy(() => SubscriptionWhereInputSchema).array() ]).optional(),
  status: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  planId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date() ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}));

export const SubscriptionOrderByWithAggregationInputSchema: z.ZodType<Prisma.SubscriptionOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  planId: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  currentPeriodEnd: z.union([ z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema) ]).optional(),
  cancelAtPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SubscriptionCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => SubscriptionAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SubscriptionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SubscriptionMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => SubscriptionSumOrderByAggregateInputSchema).optional(),
});

export const SubscriptionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SubscriptionScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => SubscriptionScalarWhereWithAggregatesInputSchema), z.lazy(() => SubscriptionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SubscriptionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SubscriptionScalarWhereWithAggregatesInputSchema), z.lazy(() => SubscriptionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  stripeCustomerId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  stripeSubscriptionId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  status: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  planId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string() ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date() ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const PaymentHistoryWhereInputSchema: z.ZodType<Prisma.PaymentHistoryWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => PaymentHistoryWhereInputSchema), z.lazy(() => PaymentHistoryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentHistoryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentHistoryWhereInputSchema), z.lazy(() => PaymentHistoryWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  stripePaymentId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  currency: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
});

export const PaymentHistoryOrderByWithRelationInputSchema: z.ZodType<Prisma.PaymentHistoryOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  currency: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
});

export const PaymentHistoryWhereUniqueInputSchema: z.ZodType<Prisma.PaymentHistoryWhereUniqueInput> = z.union([
  z.object({
    id: z.number(),
    stripePaymentId: z.string(),
  }),
  z.object({
    id: z.number(),
  }),
  z.object({
    stripePaymentId: z.string(),
  }),
])
.and(z.strictObject({
  id: z.number().optional(),
  stripePaymentId: z.string().optional(),
  AND: z.union([ z.lazy(() => PaymentHistoryWhereInputSchema), z.lazy(() => PaymentHistoryWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentHistoryWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentHistoryWhereInputSchema), z.lazy(() => PaymentHistoryWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  currency: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema), z.lazy(() => UserWhereInputSchema) ]).optional(),
}));

export const PaymentHistoryOrderByWithAggregationInputSchema: z.ZodType<Prisma.PaymentHistoryOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  currency: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => PaymentHistoryCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => PaymentHistoryAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => PaymentHistoryMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => PaymentHistoryMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => PaymentHistorySumOrderByAggregateInputSchema).optional(),
});

export const PaymentHistoryScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.PaymentHistoryScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => PaymentHistoryScalarWhereWithAggregatesInputSchema), z.lazy(() => PaymentHistoryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentHistoryScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentHistoryScalarWhereWithAggregatesInputSchema), z.lazy(() => PaymentHistoryScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  stripePaymentId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema), z.number() ]).optional(),
  currency: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.strictObject({
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
  isPremium: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatar: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  coverImage: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  rooms: z.lazy(() => RoomParticipantListRelationFilterSchema).optional(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  subscription: z.union([ z.lazy(() => SubscriptionNullableScalarRelationFilterSchema), z.lazy(() => SubscriptionWhereInputSchema) ]).optional().nullable(),
  paymentHistory: z.lazy(() => PaymentHistoryListRelationFilterSchema).optional(),
});

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  isPremium: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  avatar: z.lazy(() => MediaOrderByWithRelationInputSchema).optional(),
  coverImage: z.lazy(() => MediaOrderByWithRelationInputSchema).optional(),
  messages: z.lazy(() => MessageOrderByRelationAggregateInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantOrderByRelationAggregateInputSchema).optional(),
  sessions: z.lazy(() => SessionOrderByRelationAggregateInputSchema).optional(),
  accounts: z.lazy(() => AccountOrderByRelationAggregateInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionOrderByWithRelationInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryOrderByRelationAggregateInputSchema).optional(),
});

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.uuid(),
    email: z.string(),
  }),
  z.object({
    id: z.uuid(),
  }),
  z.object({
    email: z.string(),
  }),
])
.and(z.strictObject({
  id: z.uuid().optional(),
  email: z.string().optional(),
  AND: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  firstName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  lastName: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  password: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  role: z.union([ z.lazy(() => EnumUserRoleFilterSchema), z.lazy(() => UserRoleSchema) ]).optional(),
  isPremium: z.union([ z.lazy(() => BoolFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  avatar: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  coverImage: z.union([ z.lazy(() => MediaNullableScalarRelationFilterSchema), z.lazy(() => MediaWhereInputSchema) ]).optional().nullable(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  rooms: z.lazy(() => RoomParticipantListRelationFilterSchema).optional(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  subscription: z.union([ z.lazy(() => SubscriptionNullableScalarRelationFilterSchema), z.lazy(() => SubscriptionWhereInputSchema) ]).optional().nullable(),
  paymentHistory: z.lazy(() => PaymentHistoryListRelationFilterSchema).optional(),
}));

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  isPremium: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
});

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.strictObject({
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
  isPremium: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const VerificationWhereInputSchema: z.ZodType<Prisma.VerificationWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationWhereInputSchema), z.lazy(() => VerificationWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  hashedIdentifier: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  hashedValue: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
});

export const VerificationOrderByWithRelationInputSchema: z.ZodType<Prisma.VerificationOrderByWithRelationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

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
.and(z.strictObject({
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
}));

export const VerificationOrderByWithAggregationInputSchema: z.ZodType<Prisma.VerificationOrderByWithAggregationInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => VerificationCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => VerificationMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => VerificationMinOrderByAggregateInputSchema).optional(),
});

export const VerificationScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.VerificationScalarWhereWithAggregatesInput> = z.strictObject({
  AND: z.union([ z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema), z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema), z.lazy(() => VerificationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  hashedIdentifier: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  hashedValue: z.union([ z.lazy(() => StringWithAggregatesFilterSchema), z.string() ]).optional(),
  expiresAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date() ]).optional(),
});

export const AccountCreateInputSchema: z.ZodType<Prisma.AccountCreateInput> = z.strictObject({
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
});

export const AccountUncheckedCreateInputSchema: z.ZodType<Prisma.AccountUncheckedCreateInput> = z.strictObject({
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
});

export const AccountUpdateInputSchema: z.ZodType<Prisma.AccountUpdateInput> = z.strictObject({
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
});

export const AccountUncheckedUpdateInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateInput> = z.strictObject({
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
});

export const AccountCreateManyInputSchema: z.ZodType<Prisma.AccountCreateManyInput> = z.strictObject({
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
});

export const AccountUpdateManyMutationInputSchema: z.ZodType<Prisma.AccountUpdateManyMutationInput> = z.strictObject({
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
});

export const AccountUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyInput> = z.strictObject({
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
});

export const ContactCreateInputSchema: z.ZodType<Prisma.ContactCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const ContactUncheckedCreateInputSchema: z.ZodType<Prisma.ContactUncheckedCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const ContactUpdateInputSchema: z.ZodType<Prisma.ContactUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const ContactUncheckedUpdateInputSchema: z.ZodType<Prisma.ContactUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const ContactCreateManyInputSchema: z.ZodType<Prisma.ContactCreateManyInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const ContactUpdateManyMutationInputSchema: z.ZodType<Prisma.ContactUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const ContactUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ContactUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MediaCreateInputSchema: z.ZodType<Prisma.MediaCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  avatarUser: z.lazy(() => UserCreateNestedOneWithoutAvatarInputSchema).optional(),
  coverUser: z.lazy(() => UserCreateNestedOneWithoutCoverImageInputSchema).optional(),
  message: z.lazy(() => MessageCreateNestedOneWithoutAttachmentsInputSchema).optional(),
});

export const MediaUncheckedCreateInputSchema: z.ZodType<Prisma.MediaUncheckedCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaUpdateInputSchema: z.ZodType<Prisma.MediaUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUser: z.lazy(() => UserUpdateOneWithoutAvatarNestedInputSchema).optional(),
  coverUser: z.lazy(() => UserUpdateOneWithoutCoverImageNestedInputSchema).optional(),
  message: z.lazy(() => MessageUpdateOneWithoutAttachmentsNestedInputSchema).optional(),
});

export const MediaUncheckedUpdateInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  messageId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MediaCreateManyInputSchema: z.ZodType<Prisma.MediaCreateManyInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaUpdateManyMutationInputSchema: z.ZodType<Prisma.MediaUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MediaUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  messageId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MessageCreateInputSchema: z.ZodType<Prisma.MessageCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutMessagesInputSchema),
  room: z.lazy(() => RoomCreateNestedOneWithoutMessagesInputSchema),
  attachments: z.lazy(() => MediaCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageUncheckedCreateInputSchema: z.ZodType<Prisma.MessageUncheckedCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  roomId: z.string(),
  attachments: z.lazy(() => MediaUncheckedCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageUpdateInputSchema: z.ZodType<Prisma.MessageUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  room: z.lazy(() => RoomUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  attachments: z.lazy(() => MediaUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  attachments: z.lazy(() => MediaUncheckedUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageCreateManyInputSchema: z.ZodType<Prisma.MessageCreateManyInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  roomId: z.string(),
});

export const MessageUpdateManyMutationInputSchema: z.ZodType<Prisma.MessageUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MessageUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomCreateInputSchema: z.ZodType<Prisma.RoomCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutRoomInputSchema).optional(),
  participants: z.lazy(() => RoomParticipantCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomUncheckedCreateInputSchema: z.ZodType<Prisma.RoomUncheckedCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutRoomInputSchema).optional(),
  participants: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomUpdateInputSchema: z.ZodType<Prisma.RoomUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutRoomNestedInputSchema).optional(),
  participants: z.lazy(() => RoomParticipantUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const RoomUncheckedUpdateInputSchema: z.ZodType<Prisma.RoomUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutRoomNestedInputSchema).optional(),
  participants: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const RoomCreateManyInputSchema: z.ZodType<Prisma.RoomCreateManyInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const RoomUpdateManyMutationInputSchema: z.ZodType<Prisma.RoomUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomUncheckedUpdateManyInputSchema: z.ZodType<Prisma.RoomUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantCreateInputSchema: z.ZodType<Prisma.RoomParticipantCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  joinedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutRoomsInputSchema),
  room: z.lazy(() => RoomCreateNestedOneWithoutParticipantsInputSchema),
});

export const RoomParticipantUncheckedCreateInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedCreateInput> = z.strictObject({
  id: z.cuid().optional(),
  userId: z.string(),
  roomId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const RoomParticipantUpdateInputSchema: z.ZodType<Prisma.RoomParticipantUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutRoomsNestedInputSchema).optional(),
  room: z.lazy(() => RoomUpdateOneRequiredWithoutParticipantsNestedInputSchema).optional(),
});

export const RoomParticipantUncheckedUpdateInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantCreateManyInputSchema: z.ZodType<Prisma.RoomParticipantCreateManyInput> = z.strictObject({
  id: z.cuid().optional(),
  userId: z.string(),
  roomId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const RoomParticipantUpdateManyMutationInputSchema: z.ZodType<Prisma.RoomParticipantUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantUncheckedUpdateManyInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionCreateInputSchema: z.ZodType<Prisma.SessionCreateInput> = z.strictObject({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutSessionsInputSchema),
});

export const SessionUncheckedCreateInputSchema: z.ZodType<Prisma.SessionUncheckedCreateInput> = z.strictObject({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SessionUpdateInputSchema: z.ZodType<Prisma.SessionUpdateInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutSessionsNestedInputSchema).optional(),
});

export const SessionUncheckedUpdateInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionCreateManyInputSchema: z.ZodType<Prisma.SessionCreateManyInput> = z.strictObject({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SessionUpdateManyMutationInputSchema: z.ZodType<Prisma.SessionUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SubscriptionCreateInputSchema: z.ZodType<Prisma.SubscriptionCreateInput> = z.strictObject({
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional().nullable(),
  status: z.string(),
  planId: z.string().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutSubscriptionInputSchema),
});

export const SubscriptionUncheckedCreateInputSchema: z.ZodType<Prisma.SubscriptionUncheckedCreateInput> = z.strictObject({
  id: z.number().optional(),
  userId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional().nullable(),
  status: z.string(),
  planId: z.string().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SubscriptionUpdateInputSchema: z.ZodType<Prisma.SubscriptionUpdateInput> = z.strictObject({
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutSubscriptionNestedInputSchema).optional(),
});

export const SubscriptionUncheckedUpdateInputSchema: z.ZodType<Prisma.SubscriptionUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SubscriptionCreateManyInputSchema: z.ZodType<Prisma.SubscriptionCreateManyInput> = z.strictObject({
  id: z.number().optional(),
  userId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional().nullable(),
  status: z.string(),
  planId: z.string().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SubscriptionUpdateManyMutationInputSchema: z.ZodType<Prisma.SubscriptionUpdateManyMutationInput> = z.strictObject({
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SubscriptionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SubscriptionUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryCreateInputSchema: z.ZodType<Prisma.PaymentHistoryCreateInput> = z.strictObject({
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutPaymentHistoryInputSchema),
});

export const PaymentHistoryUncheckedCreateInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedCreateInput> = z.strictObject({
  id: z.number().optional(),
  userId: z.string(),
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const PaymentHistoryUpdateInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateInput> = z.strictObject({
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutPaymentHistoryNestedInputSchema).optional(),
});

export const PaymentHistoryUncheckedUpdateInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryCreateManyInputSchema: z.ZodType<Prisma.PaymentHistoryCreateManyInput> = z.strictObject({
  id: z.number().optional(),
  userId: z.string(),
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const PaymentHistoryUpdateManyMutationInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateManyMutationInput> = z.strictObject({
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryUncheckedUpdateManyInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const VerificationCreateInputSchema: z.ZodType<Prisma.VerificationCreateInput> = z.strictObject({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const VerificationUncheckedCreateInputSchema: z.ZodType<Prisma.VerificationUncheckedCreateInput> = z.strictObject({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const VerificationUpdateInputSchema: z.ZodType<Prisma.VerificationUpdateInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const VerificationUncheckedUpdateInputSchema: z.ZodType<Prisma.VerificationUncheckedUpdateInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const VerificationCreateManyInputSchema: z.ZodType<Prisma.VerificationCreateManyInput> = z.strictObject({
  id: z.string(),
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const VerificationUpdateManyMutationInputSchema: z.ZodType<Prisma.VerificationUpdateManyMutationInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const VerificationUncheckedUpdateManyInputSchema: z.ZodType<Prisma.VerificationUncheckedUpdateManyInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedIdentifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  hashedValue: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.strictObject({
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
});

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.strictObject({
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
});

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.strictObject({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
});

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.strictObject({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
});

export const UserScalarRelationFilterSchema: z.ZodType<Prisma.UserScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => UserWhereInputSchema).optional(),
  isNot: z.lazy(() => UserWhereInputSchema).optional(),
});

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.strictObject({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional(),
});

export const AccountProviderIdAccountIdCompoundUniqueInputSchema: z.ZodType<Prisma.AccountProviderIdAccountIdCompoundUniqueInput> = z.strictObject({
  providerId: z.string(),
  accountId: z.string(),
});

export const AccountCountOrderByAggregateInputSchema: z.ZodType<Prisma.AccountCountOrderByAggregateInput> = z.strictObject({
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
});

export const AccountMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMaxOrderByAggregateInput> = z.strictObject({
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
});

export const AccountMinOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMinOrderByAggregateInput> = z.strictObject({
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
});

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.strictObject({
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
});

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.strictObject({
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
});

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.strictObject({
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
});

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.strictObject({
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
});

export const ContactCountOrderByAggregateInputSchema: z.ZodType<Prisma.ContactCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const ContactMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ContactMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const ContactMinOrderByAggregateInputSchema: z.ZodType<Prisma.ContactMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z.strictObject({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
});

export const UserNullableScalarRelationFilterSchema: z.ZodType<Prisma.UserNullableScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => UserWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => UserWhereInputSchema).optional().nullable(),
});

export const MessageNullableScalarRelationFilterSchema: z.ZodType<Prisma.MessageNullableScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => MessageWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => MessageWhereInputSchema).optional().nullable(),
});

export const MediaCountOrderByAggregateInputSchema: z.ZodType<Prisma.MediaCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  messageId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const MediaAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MediaAvgOrderByAggregateInput> = z.strictObject({
  size: z.lazy(() => SortOrderSchema).optional(),
});

export const MediaMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MediaMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  messageId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const MediaMinOrderByAggregateInputSchema: z.ZodType<Prisma.MediaMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  key: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  size: z.lazy(() => SortOrderSchema).optional(),
  avatarUserId: z.lazy(() => SortOrderSchema).optional(),
  coverUserId: z.lazy(() => SortOrderSchema).optional(),
  messageId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const MediaSumOrderByAggregateInputSchema: z.ZodType<Prisma.MediaSumOrderByAggregateInput> = z.strictObject({
  size: z.lazy(() => SortOrderSchema).optional(),
});

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z.strictObject({
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
});

export const RoomScalarRelationFilterSchema: z.ZodType<Prisma.RoomScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => RoomWhereInputSchema).optional(),
  isNot: z.lazy(() => RoomWhereInputSchema).optional(),
});

export const MediaListRelationFilterSchema: z.ZodType<Prisma.MediaListRelationFilter> = z.strictObject({
  every: z.lazy(() => MediaWhereInputSchema).optional(),
  some: z.lazy(() => MediaWhereInputSchema).optional(),
  none: z.lazy(() => MediaWhereInputSchema).optional(),
});

export const MediaOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MediaOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const MessageCountOrderByAggregateInputSchema: z.ZodType<Prisma.MessageCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  text: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
});

export const MessageMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MessageMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  text: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
});

export const MessageMinOrderByAggregateInputSchema: z.ZodType<Prisma.MessageMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  text: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
});

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.strictObject({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
});

export const MessageListRelationFilterSchema: z.ZodType<Prisma.MessageListRelationFilter> = z.strictObject({
  every: z.lazy(() => MessageWhereInputSchema).optional(),
  some: z.lazy(() => MessageWhereInputSchema).optional(),
  none: z.lazy(() => MessageWhereInputSchema).optional(),
});

export const RoomParticipantListRelationFilterSchema: z.ZodType<Prisma.RoomParticipantListRelationFilter> = z.strictObject({
  every: z.lazy(() => RoomParticipantWhereInputSchema).optional(),
  some: z.lazy(() => RoomParticipantWhereInputSchema).optional(),
  none: z.lazy(() => RoomParticipantWhereInputSchema).optional(),
});

export const MessageOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MessageOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomParticipantOrderByRelationAggregateInputSchema: z.ZodType<Prisma.RoomParticipantOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomCountOrderByAggregateInputSchema: z.ZodType<Prisma.RoomCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isGroup: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomMaxOrderByAggregateInputSchema: z.ZodType<Prisma.RoomMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isGroup: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomMinOrderByAggregateInputSchema: z.ZodType<Prisma.RoomMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isGroup: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.strictObject({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
});

export const RoomParticipantUserIdRoomIdCompoundUniqueInputSchema: z.ZodType<Prisma.RoomParticipantUserIdRoomIdCompoundUniqueInput> = z.strictObject({
  userId: z.string(),
  roomId: z.string(),
});

export const RoomParticipantCountOrderByAggregateInputSchema: z.ZodType<Prisma.RoomParticipantCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  joinedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomParticipantMaxOrderByAggregateInputSchema: z.ZodType<Prisma.RoomParticipantMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  joinedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const RoomParticipantMinOrderByAggregateInputSchema: z.ZodType<Prisma.RoomParticipantMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  roomId: z.lazy(() => SortOrderSchema).optional(),
  joinedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SessionCountOrderByAggregateInputSchema: z.ZodType<Prisma.SessionCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SessionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SessionMinOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  ipAddress: z.lazy(() => SortOrderSchema).optional(),
  userAgent: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SubscriptionCountOrderByAggregateInputSchema: z.ZodType<Prisma.SubscriptionCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  planId: z.lazy(() => SortOrderSchema).optional(),
  currentPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  cancelAtPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SubscriptionAvgOrderByAggregateInputSchema: z.ZodType<Prisma.SubscriptionAvgOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
});

export const SubscriptionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SubscriptionMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  planId: z.lazy(() => SortOrderSchema).optional(),
  currentPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  cancelAtPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SubscriptionMinOrderByAggregateInputSchema: z.ZodType<Prisma.SubscriptionMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripeCustomerId: z.lazy(() => SortOrderSchema).optional(),
  stripeSubscriptionId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  planId: z.lazy(() => SortOrderSchema).optional(),
  currentPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  cancelAtPeriodEnd: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const SubscriptionSumOrderByAggregateInputSchema: z.ZodType<Prisma.SubscriptionSumOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistoryCountOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentHistoryCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  currency: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistoryAvgOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentHistoryAvgOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistoryMaxOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentHistoryMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  currency: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistoryMinOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentHistoryMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  stripePaymentId: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
  currency: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistorySumOrderByAggregateInputSchema: z.ZodType<Prisma.PaymentHistorySumOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  amount: z.lazy(() => SortOrderSchema).optional(),
});

export const EnumUserRoleFilterSchema: z.ZodType<Prisma.EnumUserRoleFilter> = z.strictObject({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleFilterSchema) ]).optional(),
});

export const MediaNullableScalarRelationFilterSchema: z.ZodType<Prisma.MediaNullableScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => MediaWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => MediaWhereInputSchema).optional().nullable(),
});

export const SessionListRelationFilterSchema: z.ZodType<Prisma.SessionListRelationFilter> = z.strictObject({
  every: z.lazy(() => SessionWhereInputSchema).optional(),
  some: z.lazy(() => SessionWhereInputSchema).optional(),
  none: z.lazy(() => SessionWhereInputSchema).optional(),
});

export const AccountListRelationFilterSchema: z.ZodType<Prisma.AccountListRelationFilter> = z.strictObject({
  every: z.lazy(() => AccountWhereInputSchema).optional(),
  some: z.lazy(() => AccountWhereInputSchema).optional(),
  none: z.lazy(() => AccountWhereInputSchema).optional(),
});

export const SubscriptionNullableScalarRelationFilterSchema: z.ZodType<Prisma.SubscriptionNullableScalarRelationFilter> = z.strictObject({
  is: z.lazy(() => SubscriptionWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => SubscriptionWhereInputSchema).optional().nullable(),
});

export const PaymentHistoryListRelationFilterSchema: z.ZodType<Prisma.PaymentHistoryListRelationFilter> = z.strictObject({
  every: z.lazy(() => PaymentHistoryWhereInputSchema).optional(),
  some: z.lazy(() => PaymentHistoryWhereInputSchema).optional(),
  none: z.lazy(() => PaymentHistoryWhereInputSchema).optional(),
});

export const SessionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.SessionOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const AccountOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AccountOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const PaymentHistoryOrderByRelationAggregateInputSchema: z.ZodType<Prisma.PaymentHistoryOrderByRelationAggregateInput> = z.strictObject({
  _count: z.lazy(() => SortOrderSchema).optional(),
});

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  isPremium: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  isPremium: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  firstName: z.lazy(() => SortOrderSchema).optional(),
  lastName: z.lazy(() => SortOrderSchema).optional(),
  password: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  isPremium: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const EnumUserRoleWithAggregatesFilterSchema: z.ZodType<Prisma.EnumUserRoleWithAggregatesFilter> = z.strictObject({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
});

export const VerificationHashedIdentifierHashedValueCompoundUniqueInputSchema: z.ZodType<Prisma.VerificationHashedIdentifierHashedValueCompoundUniqueInput> = z.strictObject({
  hashedIdentifier: z.string(),
  hashedValue: z.string(),
});

export const VerificationCountOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationCountOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const VerificationMaxOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationMaxOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const VerificationMinOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationMinOrderByAggregateInput> = z.strictObject({
  id: z.lazy(() => SortOrderSchema).optional(),
  hashedIdentifier: z.lazy(() => SortOrderSchema).optional(),
  hashedValue: z.lazy(() => SortOrderSchema).optional(),
  expiresAt: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
});

export const UserCreateNestedOneWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAccountsInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.strictObject({
  set: z.string().optional(),
});

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.strictObject({
  set: z.string().optional().nullable(),
});

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.strictObject({
  set: z.coerce.date().optional().nullable(),
});

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.strictObject({
  set: z.coerce.date().optional(),
});

export const UserUpdateOneRequiredWithoutAccountsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAccountsNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAccountsInputSchema), z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]).optional(),
});

export const UserCreateNestedOneWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAvatarInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAvatarInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const UserCreateNestedOneWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutCoverImageInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutCoverImageInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const MessageCreateNestedOneWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageCreateNestedOneWithoutAttachmentsInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedCreateWithoutAttachmentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MessageCreateOrConnectWithoutAttachmentsInputSchema).optional(),
  connect: z.lazy(() => MessageWhereUniqueInputSchema).optional(),
});

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.strictObject({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional(),
});

export const UserUpdateOneWithoutAvatarNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutAvatarNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAvatarInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAvatarInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAvatarInputSchema), z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]).optional(),
});

export const UserUpdateOneWithoutCoverImageNestedInputSchema: z.ZodType<Prisma.UserUpdateOneWithoutCoverImageNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutCoverImageInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutCoverImageInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutCoverImageInputSchema), z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]).optional(),
});

export const MessageUpdateOneWithoutAttachmentsNestedInputSchema: z.ZodType<Prisma.MessageUpdateOneWithoutAttachmentsNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedCreateWithoutAttachmentsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MessageCreateOrConnectWithoutAttachmentsInputSchema).optional(),
  upsert: z.lazy(() => MessageUpsertWithoutAttachmentsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MessageWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MessageWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MessageWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MessageUpdateToOneWithWhereWithoutAttachmentsInputSchema), z.lazy(() => MessageUpdateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutAttachmentsInputSchema) ]).optional(),
});

export const UserCreateNestedOneWithoutMessagesInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutMessagesInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const RoomCreateNestedOneWithoutMessagesInputSchema: z.ZodType<Prisma.RoomCreateNestedOneWithoutMessagesInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomCreateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => RoomCreateOrConnectWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => RoomWhereUniqueInputSchema).optional(),
});

export const MediaCreateNestedManyWithoutMessageInputSchema: z.ZodType<Prisma.MediaCreateNestedManyWithoutMessageInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaCreateWithoutMessageInputSchema).array(), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema), z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MediaCreateManyMessageInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
});

export const MediaUncheckedCreateNestedManyWithoutMessageInputSchema: z.ZodType<Prisma.MediaUncheckedCreateNestedManyWithoutMessageInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaCreateWithoutMessageInputSchema).array(), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema), z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MediaCreateManyMessageInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
});

export const UserUpdateOneRequiredWithoutMessagesNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutMessagesNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMessagesInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutMessagesInputSchema), z.lazy(() => UserUpdateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedUpdateWithoutMessagesInputSchema) ]).optional(),
});

export const RoomUpdateOneRequiredWithoutMessagesNestedInputSchema: z.ZodType<Prisma.RoomUpdateOneRequiredWithoutMessagesNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomCreateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => RoomCreateOrConnectWithoutMessagesInputSchema).optional(),
  upsert: z.lazy(() => RoomUpsertWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => RoomWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => RoomUpdateToOneWithWhereWithoutMessagesInputSchema), z.lazy(() => RoomUpdateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutMessagesInputSchema) ]).optional(),
});

export const MediaUpdateManyWithoutMessageNestedInputSchema: z.ZodType<Prisma.MediaUpdateManyWithoutMessageNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaCreateWithoutMessageInputSchema).array(), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema), z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MediaUpsertWithWhereUniqueWithoutMessageInputSchema), z.lazy(() => MediaUpsertWithWhereUniqueWithoutMessageInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MediaCreateManyMessageInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MediaUpdateWithWhereUniqueWithoutMessageInputSchema), z.lazy(() => MediaUpdateWithWhereUniqueWithoutMessageInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MediaUpdateManyWithWhereWithoutMessageInputSchema), z.lazy(() => MediaUpdateManyWithWhereWithoutMessageInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MediaScalarWhereInputSchema), z.lazy(() => MediaScalarWhereInputSchema).array() ]).optional(),
});

export const MediaUncheckedUpdateManyWithoutMessageNestedInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateManyWithoutMessageNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaCreateWithoutMessageInputSchema).array(), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema), z.lazy(() => MediaCreateOrConnectWithoutMessageInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MediaUpsertWithWhereUniqueWithoutMessageInputSchema), z.lazy(() => MediaUpsertWithWhereUniqueWithoutMessageInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MediaCreateManyMessageInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MediaWhereUniqueInputSchema), z.lazy(() => MediaWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MediaUpdateWithWhereUniqueWithoutMessageInputSchema), z.lazy(() => MediaUpdateWithWhereUniqueWithoutMessageInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MediaUpdateManyWithWhereWithoutMessageInputSchema), z.lazy(() => MediaUpdateManyWithWhereWithoutMessageInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MediaScalarWhereInputSchema), z.lazy(() => MediaScalarWhereInputSchema).array() ]).optional(),
});

export const MessageCreateNestedManyWithoutRoomInputSchema: z.ZodType<Prisma.MessageCreateNestedManyWithoutRoomInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageCreateWithoutRoomInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema), z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyRoomInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
});

export const RoomParticipantCreateNestedManyWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantCreateNestedManyWithoutRoomInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyRoomInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
});

export const MessageUncheckedCreateNestedManyWithoutRoomInputSchema: z.ZodType<Prisma.MessageUncheckedCreateNestedManyWithoutRoomInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageCreateWithoutRoomInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema), z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyRoomInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
});

export const RoomParticipantUncheckedCreateNestedManyWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedCreateNestedManyWithoutRoomInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyRoomInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
});

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.strictObject({
  set: z.boolean().optional(),
});

export const MessageUpdateManyWithoutRoomNestedInputSchema: z.ZodType<Prisma.MessageUpdateManyWithoutRoomNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageCreateWithoutRoomInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema), z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => MessageUpsertWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyRoomInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => MessageUpdateWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutRoomInputSchema), z.lazy(() => MessageUpdateManyWithWhereWithoutRoomInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
});

export const RoomParticipantUpdateManyWithoutRoomNestedInputSchema: z.ZodType<Prisma.RoomParticipantUpdateManyWithoutRoomNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyRoomInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutRoomInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
});

export const MessageUncheckedUpdateManyWithoutRoomNestedInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutRoomNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageCreateWithoutRoomInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema), z.lazy(() => MessageCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => MessageUpsertWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyRoomInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => MessageUpdateWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutRoomInputSchema), z.lazy(() => MessageUpdateManyWithWhereWithoutRoomInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
});

export const RoomParticipantUncheckedUpdateManyWithoutRoomNestedInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateManyWithoutRoomNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutRoomInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyRoomInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutRoomInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutRoomInputSchema), z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutRoomInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
});

export const UserCreateNestedOneWithoutRoomsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutRoomsInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedCreateWithoutRoomsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRoomsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const RoomCreateNestedOneWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomCreateNestedOneWithoutParticipantsInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomCreateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedCreateWithoutParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => RoomCreateOrConnectWithoutParticipantsInputSchema).optional(),
  connect: z.lazy(() => RoomWhereUniqueInputSchema).optional(),
});

export const UserUpdateOneRequiredWithoutRoomsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutRoomsNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedCreateWithoutRoomsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRoomsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutRoomsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutRoomsInputSchema), z.lazy(() => UserUpdateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutRoomsInputSchema) ]).optional(),
});

export const RoomUpdateOneRequiredWithoutParticipantsNestedInputSchema: z.ZodType<Prisma.RoomUpdateOneRequiredWithoutParticipantsNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomCreateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedCreateWithoutParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => RoomCreateOrConnectWithoutParticipantsInputSchema).optional(),
  upsert: z.lazy(() => RoomUpsertWithoutParticipantsInputSchema).optional(),
  connect: z.lazy(() => RoomWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => RoomUpdateToOneWithWhereWithoutParticipantsInputSchema), z.lazy(() => RoomUpdateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutParticipantsInputSchema) ]).optional(),
});

export const UserCreateNestedOneWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutSessionsInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const UserUpdateOneRequiredWithoutSessionsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutSessionsNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutSessionsInputSchema), z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]).optional(),
});

export const UserCreateNestedOneWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutSubscriptionInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedCreateWithoutSubscriptionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSubscriptionInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const UserUpdateOneRequiredWithoutSubscriptionNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutSubscriptionNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedCreateWithoutSubscriptionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSubscriptionInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutSubscriptionInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutSubscriptionInputSchema), z.lazy(() => UserUpdateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSubscriptionInputSchema) ]).optional(),
});

export const UserCreateNestedOneWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutPaymentHistoryInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutPaymentHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPaymentHistoryInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
});

export const UserUpdateOneRequiredWithoutPaymentHistoryNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutPaymentHistoryNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => UserCreateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutPaymentHistoryInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPaymentHistoryInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutPaymentHistoryInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutPaymentHistoryInputSchema), z.lazy(() => UserUpdateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutPaymentHistoryInputSchema) ]).optional(),
});

export const MediaCreateNestedOneWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateNestedOneWithoutAvatarUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
});

export const MediaCreateNestedOneWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateNestedOneWithoutCoverUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
});

export const MessageCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.MessageCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageCreateWithoutUserInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema), z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
});

export const RoomParticipantCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateWithoutUserInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
});

export const SessionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
});

export const AccountCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
});

export const SubscriptionCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionCreateNestedOneWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SubscriptionCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => SubscriptionWhereUniqueInputSchema).optional(),
});

export const PaymentHistoryCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema).array(), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentHistoryCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
});

export const MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateNestedOneWithoutAvatarUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
});

export const MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateNestedOneWithoutCoverUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
});

export const MessageUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.MessageUncheckedCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageCreateWithoutUserInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema), z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
});

export const RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateWithoutUserInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
});

export const SessionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionCreateWithoutUserInputSchema).array(), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema), z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema), z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
});

export const AccountUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountCreateWithoutUserInputSchema).array(), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema), z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema), z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
});

export const SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUncheckedCreateNestedOneWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SubscriptionCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => SubscriptionWhereUniqueInputSchema).optional(),
});

export const PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedCreateNestedManyWithoutUserInput> = z.strictObject({
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema).array(), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentHistoryCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
});

export const EnumUserRoleFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumUserRoleFieldUpdateOperationsInput> = z.strictObject({
  set: z.lazy(() => UserRoleSchema).optional(),
});

export const MediaUpdateOneWithoutAvatarUserNestedInputSchema: z.ZodType<Prisma.MediaUpdateOneWithoutAvatarUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutAvatarUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema), z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]).optional(),
});

export const MediaUpdateOneWithoutCoverUserNestedInputSchema: z.ZodType<Prisma.MediaUpdateOneWithoutCoverUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutCoverUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutCoverUserInputSchema), z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]).optional(),
});

export const MessageUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.MessageUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageCreateWithoutUserInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema), z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => MessageUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => MessageUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => MessageUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
});

export const RoomParticipantUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.RoomParticipantUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateWithoutUserInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
});

export const SessionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUpdateManyWithoutUserNestedInput> = z.strictObject({
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
});

export const AccountUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUpdateManyWithoutUserNestedInput> = z.strictObject({
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
});

export const SubscriptionUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.SubscriptionUpdateOneWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SubscriptionCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => SubscriptionUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => SubscriptionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => SubscriptionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => SubscriptionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SubscriptionUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => SubscriptionUpdateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedUpdateWithoutUserInputSchema) ]).optional(),
});

export const PaymentHistoryUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema).array(), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PaymentHistoryUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentHistoryCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PaymentHistoryUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PaymentHistoryUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PaymentHistoryScalarWhereInputSchema), z.lazy(() => PaymentHistoryScalarWhereInputSchema).array() ]).optional(),
});

export const MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateOneWithoutAvatarUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutAvatarUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutAvatarUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema), z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]).optional(),
});

export const MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateOneWithoutCoverUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MediaCreateOrConnectWithoutCoverUserInputSchema).optional(),
  upsert: z.lazy(() => MediaUpsertWithoutCoverUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MediaWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MediaWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MediaUpdateToOneWithWhereWithoutCoverUserInputSchema), z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]).optional(),
});

export const MessageUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageCreateWithoutUserInputSchema).array(), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema), z.lazy(() => MessageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => MessageUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema), z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => MessageUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => MessageUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
});

export const RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateWithoutUserInputSchema).array(), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema), z.lazy(() => RoomParticipantCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => RoomParticipantUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RoomParticipantCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => RoomParticipantWhereUniqueInputSchema), z.lazy(() => RoomParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => RoomParticipantUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => RoomParticipantUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
});

export const SessionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserNestedInput> = z.strictObject({
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
});

export const AccountUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserNestedInput> = z.strictObject({
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
});

export const SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.SubscriptionUncheckedUpdateOneWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SubscriptionCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => SubscriptionUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => SubscriptionWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => SubscriptionWhereInputSchema) ]).optional(),
  connect: z.lazy(() => SubscriptionWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SubscriptionUpdateToOneWithWhereWithoutUserInputSchema), z.lazy(() => SubscriptionUpdateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedUpdateWithoutUserInputSchema) ]).optional(),
});

export const PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedUpdateManyWithoutUserNestedInput> = z.strictObject({
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema).array(), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema), z.lazy(() => PaymentHistoryCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PaymentHistoryUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PaymentHistoryCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PaymentHistoryWhereUniqueInputSchema), z.lazy(() => PaymentHistoryWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PaymentHistoryUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PaymentHistoryUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => PaymentHistoryUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PaymentHistoryScalarWhereInputSchema), z.lazy(() => PaymentHistoryScalarWhereInputSchema).array() ]).optional(),
});

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.strictObject({
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
});

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.strictObject({
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
});

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.strictObject({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
});

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.strictObject({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
});

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.strictObject({
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
});

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.strictObject({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
});

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.strictObject({
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
});

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.strictObject({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
});

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.strictObject({
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
});

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.strictObject({
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
});

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z.strictObject({
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
});

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.strictObject({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
});

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.strictObject({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
});

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.strictObject({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional(),
});

export const NestedEnumUserRoleFilterSchema: z.ZodType<Prisma.NestedEnumUserRoleFilter> = z.strictObject({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleFilterSchema) ]).optional(),
});

export const NestedEnumUserRoleWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumUserRoleWithAggregatesFilter> = z.strictObject({
  equals: z.lazy(() => UserRoleSchema).optional(),
  in: z.lazy(() => UserRoleSchema).array().optional(),
  notIn: z.lazy(() => UserRoleSchema).array().optional(),
  not: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => NestedEnumUserRoleWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumUserRoleFilterSchema).optional(),
});

export const UserCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateWithoutAccountsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAccountsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAccountsInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
});

export const UserUpsertWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpsertWithoutAccountsInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAccountsInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
});

export const UserUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateWithoutAccountsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAccountsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserCreateWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateWithoutAvatarInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAvatarInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutAvatarInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAvatarInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]),
});

export const UserCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateWithoutCoverImageInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutCoverImageInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutCoverImageInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutCoverImageInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]),
});

export const MessageCreateWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageCreateWithoutAttachmentsInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutMessagesInputSchema),
  room: z.lazy(() => RoomCreateNestedOneWithoutMessagesInputSchema),
});

export const MessageUncheckedCreateWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageUncheckedCreateWithoutAttachmentsInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  roomId: z.string(),
});

export const MessageCreateOrConnectWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageCreateOrConnectWithoutAttachmentsInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MessageCreateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedCreateWithoutAttachmentsInputSchema) ]),
});

export const UserUpsertWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpsertWithoutAvatarInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedCreateWithoutAvatarInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAvatarInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAvatarInputSchema), z.lazy(() => UserUncheckedUpdateWithoutAvatarInputSchema) ]),
});

export const UserUpdateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUpdateWithoutAvatarInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutAvatarInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAvatarInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUpsertWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpsertWithoutCoverImageInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedCreateWithoutCoverImageInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutCoverImageInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutCoverImageInputSchema), z.lazy(() => UserUncheckedUpdateWithoutCoverImageInputSchema) ]),
});

export const UserUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUpdateWithoutCoverImageInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutCoverImageInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const MessageUpsertWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageUpsertWithoutAttachmentsInput> = z.strictObject({
  update: z.union([ z.lazy(() => MessageUpdateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutAttachmentsInputSchema) ]),
  create: z.union([ z.lazy(() => MessageCreateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedCreateWithoutAttachmentsInputSchema) ]),
  where: z.lazy(() => MessageWhereInputSchema).optional(),
});

export const MessageUpdateToOneWithWhereWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageUpdateToOneWithWhereWithoutAttachmentsInput> = z.strictObject({
  where: z.lazy(() => MessageWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MessageUpdateWithoutAttachmentsInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutAttachmentsInputSchema) ]),
});

export const MessageUpdateWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageUpdateWithoutAttachmentsInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  room: z.lazy(() => RoomUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateWithoutAttachmentsInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateWithoutAttachmentsInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
});

export const UserCreateWithoutMessagesInputSchema: z.ZodType<Prisma.UserCreateWithoutMessagesInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutMessagesInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutMessagesInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutMessagesInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutMessagesInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedCreateWithoutMessagesInputSchema) ]),
});

export const RoomCreateWithoutMessagesInputSchema: z.ZodType<Prisma.RoomCreateWithoutMessagesInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  participants: z.lazy(() => RoomParticipantCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomUncheckedCreateWithoutMessagesInputSchema: z.ZodType<Prisma.RoomUncheckedCreateWithoutMessagesInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  participants: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomCreateOrConnectWithoutMessagesInputSchema: z.ZodType<Prisma.RoomCreateOrConnectWithoutMessagesInput> = z.strictObject({
  where: z.lazy(() => RoomWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => RoomCreateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedCreateWithoutMessagesInputSchema) ]),
});

export const MediaCreateWithoutMessageInputSchema: z.ZodType<Prisma.MediaCreateWithoutMessageInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  avatarUser: z.lazy(() => UserCreateNestedOneWithoutAvatarInputSchema).optional(),
  coverUser: z.lazy(() => UserCreateNestedOneWithoutCoverImageInputSchema).optional(),
});

export const MediaUncheckedCreateWithoutMessageInputSchema: z.ZodType<Prisma.MediaUncheckedCreateWithoutMessageInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaCreateOrConnectWithoutMessageInputSchema: z.ZodType<Prisma.MediaCreateOrConnectWithoutMessageInput> = z.strictObject({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema) ]),
});

export const MediaCreateManyMessageInputEnvelopeSchema: z.ZodType<Prisma.MediaCreateManyMessageInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => MediaCreateManyMessageInputSchema), z.lazy(() => MediaCreateManyMessageInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const UserUpsertWithoutMessagesInputSchema: z.ZodType<Prisma.UserUpsertWithoutMessagesInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedUpdateWithoutMessagesInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedCreateWithoutMessagesInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutMessagesInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutMessagesInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutMessagesInputSchema), z.lazy(() => UserUncheckedUpdateWithoutMessagesInputSchema) ]),
});

export const UserUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.UserUpdateWithoutMessagesInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutMessagesInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const RoomUpsertWithoutMessagesInputSchema: z.ZodType<Prisma.RoomUpsertWithoutMessagesInput> = z.strictObject({
  update: z.union([ z.lazy(() => RoomUpdateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutMessagesInputSchema) ]),
  create: z.union([ z.lazy(() => RoomCreateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedCreateWithoutMessagesInputSchema) ]),
  where: z.lazy(() => RoomWhereInputSchema).optional(),
});

export const RoomUpdateToOneWithWhereWithoutMessagesInputSchema: z.ZodType<Prisma.RoomUpdateToOneWithWhereWithoutMessagesInput> = z.strictObject({
  where: z.lazy(() => RoomWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => RoomUpdateWithoutMessagesInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutMessagesInputSchema) ]),
});

export const RoomUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.RoomUpdateWithoutMessagesInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => RoomParticipantUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const RoomUncheckedUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.RoomUncheckedUpdateWithoutMessagesInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const MediaUpsertWithWhereUniqueWithoutMessageInputSchema: z.ZodType<Prisma.MediaUpsertWithWhereUniqueWithoutMessageInput> = z.strictObject({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MediaUpdateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutMessageInputSchema) ]),
  create: z.union([ z.lazy(() => MediaCreateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedCreateWithoutMessageInputSchema) ]),
});

export const MediaUpdateWithWhereUniqueWithoutMessageInputSchema: z.ZodType<Prisma.MediaUpdateWithWhereUniqueWithoutMessageInput> = z.strictObject({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MediaUpdateWithoutMessageInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutMessageInputSchema) ]),
});

export const MediaUpdateManyWithWhereWithoutMessageInputSchema: z.ZodType<Prisma.MediaUpdateManyWithWhereWithoutMessageInput> = z.strictObject({
  where: z.lazy(() => MediaScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MediaUpdateManyMutationInputSchema), z.lazy(() => MediaUncheckedUpdateManyWithoutMessageInputSchema) ]),
});

export const MediaScalarWhereInputSchema: z.ZodType<Prisma.MediaScalarWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => MediaScalarWhereInputSchema), z.lazy(() => MediaScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MediaScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MediaScalarWhereInputSchema), z.lazy(() => MediaScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  key: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  size: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  avatarUserId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  coverUserId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  messageId: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
});

export const MessageCreateWithoutRoomInputSchema: z.ZodType<Prisma.MessageCreateWithoutRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutMessagesInputSchema),
  attachments: z.lazy(() => MediaCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageUncheckedCreateWithoutRoomInputSchema: z.ZodType<Prisma.MessageUncheckedCreateWithoutRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  attachments: z.lazy(() => MediaUncheckedCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageCreateOrConnectWithoutRoomInputSchema: z.ZodType<Prisma.MessageCreateOrConnectWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema) ]),
});

export const MessageCreateManyRoomInputEnvelopeSchema: z.ZodType<Prisma.MessageCreateManyRoomInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => MessageCreateManyRoomInputSchema), z.lazy(() => MessageCreateManyRoomInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const RoomParticipantCreateWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantCreateWithoutRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  joinedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutRoomsInputSchema),
});

export const RoomParticipantUncheckedCreateWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedCreateWithoutRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  userId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const RoomParticipantCreateOrConnectWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantCreateOrConnectWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema) ]),
});

export const RoomParticipantCreateManyRoomInputEnvelopeSchema: z.ZodType<Prisma.RoomParticipantCreateManyRoomInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => RoomParticipantCreateManyRoomInputSchema), z.lazy(() => RoomParticipantCreateManyRoomInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const MessageUpsertWithWhereUniqueWithoutRoomInputSchema: z.ZodType<Prisma.MessageUpsertWithWhereUniqueWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MessageUpdateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutRoomInputSchema) ]),
  create: z.union([ z.lazy(() => MessageCreateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedCreateWithoutRoomInputSchema) ]),
});

export const MessageUpdateWithWhereUniqueWithoutRoomInputSchema: z.ZodType<Prisma.MessageUpdateWithWhereUniqueWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateWithoutRoomInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutRoomInputSchema) ]),
});

export const MessageUpdateManyWithWhereWithoutRoomInputSchema: z.ZodType<Prisma.MessageUpdateManyWithWhereWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => MessageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateManyMutationInputSchema), z.lazy(() => MessageUncheckedUpdateManyWithoutRoomInputSchema) ]),
});

export const MessageScalarWhereInputSchema: z.ZodType<Prisma.MessageScalarWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageScalarWhereInputSchema), z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  text: z.union([ z.lazy(() => StringNullableFilterSchema), z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
});

export const RoomParticipantUpsertWithWhereUniqueWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUpsertWithWhereUniqueWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateWithoutRoomInputSchema) ]),
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutRoomInputSchema) ]),
});

export const RoomParticipantUpdateWithWhereUniqueWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUpdateWithWhereUniqueWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => RoomParticipantUpdateWithoutRoomInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateWithoutRoomInputSchema) ]),
});

export const RoomParticipantUpdateManyWithWhereWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUpdateManyWithWhereWithoutRoomInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => RoomParticipantUpdateManyMutationInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutRoomInputSchema) ]),
});

export const RoomParticipantScalarWhereInputSchema: z.ZodType<Prisma.RoomParticipantScalarWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RoomParticipantScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RoomParticipantScalarWhereInputSchema), z.lazy(() => RoomParticipantScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  roomId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  joinedAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
});

export const UserCreateWithoutRoomsInputSchema: z.ZodType<Prisma.UserCreateWithoutRoomsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutRoomsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutRoomsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutRoomsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutRoomsInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedCreateWithoutRoomsInputSchema) ]),
});

export const RoomCreateWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomCreateWithoutParticipantsInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomUncheckedCreateWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomUncheckedCreateWithoutParticipantsInput> = z.strictObject({
  id: z.cuid().optional(),
  name: z.string().optional().nullable(),
  isGroup: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutRoomInputSchema).optional(),
});

export const RoomCreateOrConnectWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomCreateOrConnectWithoutParticipantsInput> = z.strictObject({
  where: z.lazy(() => RoomWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => RoomCreateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedCreateWithoutParticipantsInputSchema) ]),
});

export const UserUpsertWithoutRoomsInputSchema: z.ZodType<Prisma.UserUpsertWithoutRoomsInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutRoomsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedCreateWithoutRoomsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutRoomsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutRoomsInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutRoomsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutRoomsInputSchema) ]),
});

export const UserUpdateWithoutRoomsInputSchema: z.ZodType<Prisma.UserUpdateWithoutRoomsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutRoomsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutRoomsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const RoomUpsertWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomUpsertWithoutParticipantsInput> = z.strictObject({
  update: z.union([ z.lazy(() => RoomUpdateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutParticipantsInputSchema) ]),
  create: z.union([ z.lazy(() => RoomCreateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedCreateWithoutParticipantsInputSchema) ]),
  where: z.lazy(() => RoomWhereInputSchema).optional(),
});

export const RoomUpdateToOneWithWhereWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomUpdateToOneWithWhereWithoutParticipantsInput> = z.strictObject({
  where: z.lazy(() => RoomWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => RoomUpdateWithoutParticipantsInputSchema), z.lazy(() => RoomUncheckedUpdateWithoutParticipantsInputSchema) ]),
});

export const RoomUpdateWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomUpdateWithoutParticipantsInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const RoomUncheckedUpdateWithoutParticipantsInputSchema: z.ZodType<Prisma.RoomUncheckedUpdateWithoutParticipantsInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isGroup: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutRoomNestedInputSchema).optional(),
});

export const UserCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateWithoutSessionsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSessionsInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutSessionsInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
});

export const UserUpsertWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpsertWithoutSessionsInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutSessionsInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
});

export const UserUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateWithoutSessionsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutSessionsInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserCreateWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserCreateWithoutSubscriptionInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSubscriptionInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutSubscriptionInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedCreateWithoutSubscriptionInputSchema) ]),
});

export const UserUpsertWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserUpsertWithoutSubscriptionInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSubscriptionInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedCreateWithoutSubscriptionInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutSubscriptionInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutSubscriptionInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSubscriptionInputSchema) ]),
});

export const UserUpdateWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserUpdateWithoutSubscriptionInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutSubscriptionInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutSubscriptionInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  paymentHistory: z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
});

export const UserCreateWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserCreateWithoutPaymentHistoryInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionCreateNestedOneWithoutUserInputSchema).optional(),
});

export const UserUncheckedCreateWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutPaymentHistoryInput> = z.strictObject({
  id: z.uuid().optional(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
  role: z.lazy(() => UserRoleSchema).optional(),
  isPremium: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  avatar: z.lazy(() => MediaUncheckedCreateNestedOneWithoutAvatarUserInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedCreateNestedOneWithoutCoverUserInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
});

export const UserCreateOrConnectWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutPaymentHistoryInput> = z.strictObject({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutPaymentHistoryInputSchema) ]),
});

export const UserUpsertWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserUpsertWithoutPaymentHistoryInput> = z.strictObject({
  update: z.union([ z.lazy(() => UserUpdateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutPaymentHistoryInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedCreateWithoutPaymentHistoryInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional(),
});

export const UserUpdateToOneWithWhereWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutPaymentHistoryInput> = z.strictObject({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutPaymentHistoryInputSchema), z.lazy(() => UserUncheckedUpdateWithoutPaymentHistoryInputSchema) ]),
});

export const UserUpdateWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserUpdateWithoutPaymentHistoryInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUpdateOneWithoutUserNestedInputSchema).optional(),
});

export const UserUncheckedUpdateWithoutPaymentHistoryInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutPaymentHistoryInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  firstName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  password: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  role: z.union([ z.lazy(() => UserRoleSchema), z.lazy(() => EnumUserRoleFieldUpdateOperationsInputSchema) ]).optional(),
  isPremium: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatar: z.lazy(() => MediaUncheckedUpdateOneWithoutAvatarUserNestedInputSchema).optional(),
  coverImage: z.lazy(() => MediaUncheckedUpdateOneWithoutCoverUserNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  rooms: z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  subscription: z.lazy(() => SubscriptionUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
});

export const MediaCreateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateWithoutAvatarUserInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  coverUser: z.lazy(() => UserCreateNestedOneWithoutCoverImageInputSchema).optional(),
  message: z.lazy(() => MessageCreateNestedOneWithoutAttachmentsInputSchema).optional(),
});

export const MediaUncheckedCreateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateWithoutAvatarUserInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  coverUserId: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaCreateOrConnectWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaCreateOrConnectWithoutAvatarUserInput> = z.strictObject({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]),
});

export const MediaCreateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateWithoutCoverUserInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.coerce.date().optional(),
  avatarUser: z.lazy(() => UserCreateNestedOneWithoutAvatarInputSchema).optional(),
  message: z.lazy(() => MessageCreateNestedOneWithoutAttachmentsInputSchema).optional(),
});

export const MediaUncheckedCreateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedCreateWithoutCoverUserInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaCreateOrConnectWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaCreateOrConnectWithoutCoverUserInput> = z.strictObject({
  where: z.lazy(() => MediaWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]),
});

export const MessageCreateWithoutUserInputSchema: z.ZodType<Prisma.MessageCreateWithoutUserInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  room: z.lazy(() => RoomCreateNestedOneWithoutMessagesInputSchema),
  attachments: z.lazy(() => MediaCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.MessageUncheckedCreateWithoutUserInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  roomId: z.string(),
  attachments: z.lazy(() => MediaUncheckedCreateNestedManyWithoutMessageInputSchema).optional(),
});

export const MessageCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.MessageCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema) ]),
});

export const MessageCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.MessageCreateManyUserInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => MessageCreateManyUserInputSchema), z.lazy(() => MessageCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const RoomParticipantCreateWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantCreateWithoutUserInput> = z.strictObject({
  id: z.cuid().optional(),
  joinedAt: z.coerce.date().optional(),
  room: z.lazy(() => RoomCreateNestedOneWithoutParticipantsInputSchema),
});

export const RoomParticipantUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedCreateWithoutUserInput> = z.strictObject({
  id: z.cuid().optional(),
  roomId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const RoomParticipantCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema) ]),
});

export const RoomParticipantCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.RoomParticipantCreateManyUserInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => RoomParticipantCreateManyUserInputSchema), z.lazy(() => RoomParticipantCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const SessionCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateWithoutUserInput> = z.strictObject({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SessionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateWithoutUserInput> = z.strictObject({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SessionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
});

export const SessionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.SessionCreateManyUserInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => SessionCreateManyUserInputSchema), z.lazy(() => SessionCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const AccountCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateWithoutUserInput> = z.strictObject({
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
});

export const AccountUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateWithoutUserInput> = z.strictObject({
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
});

export const AccountCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
});

export const AccountCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.AccountCreateManyUserInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => AccountCreateManyUserInputSchema), z.lazy(() => AccountCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const SubscriptionCreateWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionCreateWithoutUserInput> = z.strictObject({
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional().nullable(),
  status: z.string(),
  planId: z.string().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SubscriptionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUncheckedCreateWithoutUserInput> = z.strictObject({
  id: z.number().optional(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional().nullable(),
  status: z.string(),
  planId: z.string().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const SubscriptionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SubscriptionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]),
});

export const PaymentHistoryCreateWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryCreateWithoutUserInput> = z.strictObject({
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const PaymentHistoryUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedCreateWithoutUserInput> = z.strictObject({
  id: z.number().optional(),
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const PaymentHistoryCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryCreateOrConnectWithoutUserInput> = z.strictObject({
  where: z.lazy(() => PaymentHistoryWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema) ]),
});

export const PaymentHistoryCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.PaymentHistoryCreateManyUserInputEnvelope> = z.strictObject({
  data: z.union([ z.lazy(() => PaymentHistoryCreateManyUserInputSchema), z.lazy(() => PaymentHistoryCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional(),
});

export const MediaUpsertWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpsertWithoutAvatarUserInput> = z.strictObject({
  update: z.union([ z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]),
  create: z.union([ z.lazy(() => MediaCreateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutAvatarUserInputSchema) ]),
  where: z.lazy(() => MediaWhereInputSchema).optional(),
});

export const MediaUpdateToOneWithWhereWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpdateToOneWithWhereWithoutAvatarUserInput> = z.strictObject({
  where: z.lazy(() => MediaWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MediaUpdateWithoutAvatarUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutAvatarUserInputSchema) ]),
});

export const MediaUpdateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUpdateWithoutAvatarUserInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  coverUser: z.lazy(() => UserUpdateOneWithoutCoverImageNestedInputSchema).optional(),
  message: z.lazy(() => MessageUpdateOneWithoutAttachmentsNestedInputSchema).optional(),
});

export const MediaUncheckedUpdateWithoutAvatarUserInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateWithoutAvatarUserInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  messageId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MediaUpsertWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpsertWithoutCoverUserInput> = z.strictObject({
  update: z.union([ z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]),
  create: z.union([ z.lazy(() => MediaCreateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedCreateWithoutCoverUserInputSchema) ]),
  where: z.lazy(() => MediaWhereInputSchema).optional(),
});

export const MediaUpdateToOneWithWhereWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpdateToOneWithWhereWithoutCoverUserInput> = z.strictObject({
  where: z.lazy(() => MediaWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MediaUpdateWithoutCoverUserInputSchema), z.lazy(() => MediaUncheckedUpdateWithoutCoverUserInputSchema) ]),
});

export const MediaUpdateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUpdateWithoutCoverUserInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUser: z.lazy(() => UserUpdateOneWithoutAvatarNestedInputSchema).optional(),
  message: z.lazy(() => MessageUpdateOneWithoutAttachmentsNestedInputSchema).optional(),
});

export const MediaUncheckedUpdateWithoutCoverUserInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateWithoutCoverUserInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  messageId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MessageUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.MessageUpsertWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MessageUpdateWithoutUserInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => MessageCreateWithoutUserInputSchema), z.lazy(() => MessageUncheckedCreateWithoutUserInputSchema) ]),
});

export const MessageUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.MessageUpdateWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateWithoutUserInputSchema), z.lazy(() => MessageUncheckedUpdateWithoutUserInputSchema) ]),
});

export const MessageUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.MessageUpdateManyWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => MessageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateManyMutationInputSchema), z.lazy(() => MessageUncheckedUpdateManyWithoutUserInputSchema) ]),
});

export const RoomParticipantUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUpsertWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => RoomParticipantUpdateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => RoomParticipantCreateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedCreateWithoutUserInputSchema) ]),
});

export const RoomParticipantUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUpdateWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => RoomParticipantUpdateWithoutUserInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateWithoutUserInputSchema) ]),
});

export const RoomParticipantUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUpdateManyWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => RoomParticipantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => RoomParticipantUpdateManyMutationInputSchema), z.lazy(() => RoomParticipantUncheckedUpdateManyWithoutUserInputSchema) ]),
});

export const SessionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpsertWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema), z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema), z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
});

export const SessionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema), z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
});

export const SessionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateManyWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SessionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateManyMutationInputSchema), z.lazy(() => SessionUncheckedUpdateManyWithoutUserInputSchema) ]),
});

export const SessionScalarWhereInputSchema: z.ZodType<Prisma.SessionScalarWhereInput> = z.strictObject({
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
});

export const AccountUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpsertWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema), z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema), z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
});

export const AccountUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema), z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
});

export const AccountUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateManyWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => AccountScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateManyMutationInputSchema), z.lazy(() => AccountUncheckedUpdateManyWithoutUserInputSchema) ]),
});

export const AccountScalarWhereInputSchema: z.ZodType<Prisma.AccountScalarWhereInput> = z.strictObject({
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
});

export const SubscriptionUpsertWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUpsertWithoutUserInput> = z.strictObject({
  update: z.union([ z.lazy(() => SubscriptionUpdateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => SubscriptionCreateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedCreateWithoutUserInputSchema) ]),
  where: z.lazy(() => SubscriptionWhereInputSchema).optional(),
});

export const SubscriptionUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUpdateToOneWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => SubscriptionWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SubscriptionUpdateWithoutUserInputSchema), z.lazy(() => SubscriptionUncheckedUpdateWithoutUserInputSchema) ]),
});

export const SubscriptionUpdateWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUpdateWithoutUserInput> = z.strictObject({
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SubscriptionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.SubscriptionUncheckedUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  stripeCustomerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  stripeSubscriptionId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  planId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  currentPeriodEnd: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cancelAtPeriodEnd: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUpsertWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => PaymentHistoryWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => PaymentHistoryUpdateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => PaymentHistoryCreateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedCreateWithoutUserInputSchema) ]),
});

export const PaymentHistoryUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateWithWhereUniqueWithoutUserInput> = z.strictObject({
  where: z.lazy(() => PaymentHistoryWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => PaymentHistoryUpdateWithoutUserInputSchema), z.lazy(() => PaymentHistoryUncheckedUpdateWithoutUserInputSchema) ]),
});

export const PaymentHistoryUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateManyWithWhereWithoutUserInput> = z.strictObject({
  where: z.lazy(() => PaymentHistoryScalarWhereInputSchema),
  data: z.union([ z.lazy(() => PaymentHistoryUpdateManyMutationInputSchema), z.lazy(() => PaymentHistoryUncheckedUpdateManyWithoutUserInputSchema) ]),
});

export const PaymentHistoryScalarWhereInputSchema: z.ZodType<Prisma.PaymentHistoryScalarWhereInput> = z.strictObject({
  AND: z.union([ z.lazy(() => PaymentHistoryScalarWhereInputSchema), z.lazy(() => PaymentHistoryScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PaymentHistoryScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PaymentHistoryScalarWhereInputSchema), z.lazy(() => PaymentHistoryScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  stripePaymentId: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  amount: z.union([ z.lazy(() => IntFilterSchema), z.number() ]).optional(),
  currency: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  status: z.union([ z.lazy(() => StringFilterSchema), z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema), z.coerce.date() ]).optional(),
});

export const MediaCreateManyMessageInputSchema: z.ZodType<Prisma.MediaCreateManyMessageInput> = z.strictObject({
  id: z.uuid().optional(),
  url: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number(),
  avatarUserId: z.string().optional().nullable(),
  coverUserId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
});

export const MediaUpdateWithoutMessageInputSchema: z.ZodType<Prisma.MediaUpdateWithoutMessageInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUser: z.lazy(() => UserUpdateOneWithoutAvatarNestedInputSchema).optional(),
  coverUser: z.lazy(() => UserUpdateOneWithoutCoverImageNestedInputSchema).optional(),
});

export const MediaUncheckedUpdateWithoutMessageInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateWithoutMessageInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MediaUncheckedUpdateManyWithoutMessageInputSchema: z.ZodType<Prisma.MediaUncheckedUpdateManyWithoutMessageInput> = z.strictObject({
  id: z.union([ z.uuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  key: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  size: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  avatarUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  coverUserId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MessageCreateManyRoomInputSchema: z.ZodType<Prisma.MessageCreateManyRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
});

export const RoomParticipantCreateManyRoomInputSchema: z.ZodType<Prisma.RoomParticipantCreateManyRoomInput> = z.strictObject({
  id: z.cuid().optional(),
  userId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const MessageUpdateWithoutRoomInputSchema: z.ZodType<Prisma.MessageUpdateWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  attachments: z.lazy(() => MediaUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateWithoutRoomInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  attachments: z.lazy(() => MediaUncheckedUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateManyWithoutRoomInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantUpdateWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUpdateWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutRoomsNestedInputSchema).optional(),
});

export const RoomParticipantUncheckedUpdateWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantUncheckedUpdateManyWithoutRoomInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateManyWithoutRoomInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const MessageCreateManyUserInputSchema: z.ZodType<Prisma.MessageCreateManyUserInput> = z.strictObject({
  id: z.cuid().optional(),
  text: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  roomId: z.string(),
});

export const RoomParticipantCreateManyUserInputSchema: z.ZodType<Prisma.RoomParticipantCreateManyUserInput> = z.strictObject({
  id: z.cuid().optional(),
  roomId: z.string(),
  joinedAt: z.coerce.date().optional(),
});

export const SessionCreateManyUserInputSchema: z.ZodType<Prisma.SessionCreateManyUserInput> = z.strictObject({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const AccountCreateManyUserInputSchema: z.ZodType<Prisma.AccountCreateManyUserInput> = z.strictObject({
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
});

export const PaymentHistoryCreateManyUserInputSchema: z.ZodType<Prisma.PaymentHistoryCreateManyUserInput> = z.strictObject({
  id: z.number().optional(),
  stripePaymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.coerce.date().optional(),
});

export const MessageUpdateWithoutUserInputSchema: z.ZodType<Prisma.MessageUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  room: z.lazy(() => RoomUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  attachments: z.lazy(() => MediaUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  attachments: z.lazy(() => MediaUncheckedUpdateManyWithoutMessageNestedInputSchema).optional(),
});

export const MessageUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  text: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantUpdateWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  room: z.lazy(() => RoomUpdateOneRequiredWithoutParticipantsNestedInputSchema).optional(),
});

export const RoomParticipantUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const RoomParticipantUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.RoomParticipantUncheckedUpdateManyWithoutUserInput> = z.strictObject({
  id: z.union([ z.cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  roomId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  joinedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const SessionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserInput> = z.strictObject({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expiresAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  ipAddress: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  userAgent: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const AccountUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithoutUserInput> = z.strictObject({
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
});

export const AccountUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateWithoutUserInput> = z.strictObject({
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
});

export const AccountUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserInput> = z.strictObject({
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
});

export const PaymentHistoryUpdateWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUpdateWithoutUserInput> = z.strictObject({
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedUpdateWithoutUserInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

export const PaymentHistoryUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.PaymentHistoryUncheckedUpdateManyWithoutUserInput> = z.strictObject({
  id: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  stripePaymentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  amount: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  currency: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
});

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

export const ContactFindFirstArgsSchema: z.ZodType<Prisma.ContactFindFirstArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereInputSchema.optional(), 
  orderBy: z.union([ ContactOrderByWithRelationInputSchema.array(), ContactOrderByWithRelationInputSchema ]).optional(),
  cursor: ContactWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ContactScalarFieldEnumSchema, ContactScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ContactFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ContactFindFirstOrThrowArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereInputSchema.optional(), 
  orderBy: z.union([ ContactOrderByWithRelationInputSchema.array(), ContactOrderByWithRelationInputSchema ]).optional(),
  cursor: ContactWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ContactScalarFieldEnumSchema, ContactScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ContactFindManyArgsSchema: z.ZodType<Prisma.ContactFindManyArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereInputSchema.optional(), 
  orderBy: z.union([ ContactOrderByWithRelationInputSchema.array(), ContactOrderByWithRelationInputSchema ]).optional(),
  cursor: ContactWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ContactScalarFieldEnumSchema, ContactScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const ContactAggregateArgsSchema: z.ZodType<Prisma.ContactAggregateArgs> = z.object({
  where: ContactWhereInputSchema.optional(), 
  orderBy: z.union([ ContactOrderByWithRelationInputSchema.array(), ContactOrderByWithRelationInputSchema ]).optional(),
  cursor: ContactWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ContactGroupByArgsSchema: z.ZodType<Prisma.ContactGroupByArgs> = z.object({
  where: ContactWhereInputSchema.optional(), 
  orderBy: z.union([ ContactOrderByWithAggregationInputSchema.array(), ContactOrderByWithAggregationInputSchema ]).optional(),
  by: ContactScalarFieldEnumSchema.array(), 
  having: ContactScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const ContactFindUniqueArgsSchema: z.ZodType<Prisma.ContactFindUniqueArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereUniqueInputSchema, 
}).strict();

export const ContactFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ContactFindUniqueOrThrowArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereUniqueInputSchema, 
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

export const MessageFindFirstArgsSchema: z.ZodType<Prisma.MessageFindFirstArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(), 
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(), MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema, MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MessageFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MessageFindFirstOrThrowArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(), 
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(), MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema, MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MessageFindManyArgsSchema: z.ZodType<Prisma.MessageFindManyArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(), 
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(), MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema, MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const MessageAggregateArgsSchema: z.ZodType<Prisma.MessageAggregateArgs> = z.object({
  where: MessageWhereInputSchema.optional(), 
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(), MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const MessageGroupByArgsSchema: z.ZodType<Prisma.MessageGroupByArgs> = z.object({
  where: MessageWhereInputSchema.optional(), 
  orderBy: z.union([ MessageOrderByWithAggregationInputSchema.array(), MessageOrderByWithAggregationInputSchema ]).optional(),
  by: MessageScalarFieldEnumSchema.array(), 
  having: MessageScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const MessageFindUniqueArgsSchema: z.ZodType<Prisma.MessageFindUniqueArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema, 
}).strict();

export const MessageFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MessageFindUniqueOrThrowArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema, 
}).strict();

export const RoomFindFirstArgsSchema: z.ZodType<Prisma.RoomFindFirstArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereInputSchema.optional(), 
  orderBy: z.union([ RoomOrderByWithRelationInputSchema.array(), RoomOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomScalarFieldEnumSchema, RoomScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomFindFirstOrThrowArgsSchema: z.ZodType<Prisma.RoomFindFirstOrThrowArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereInputSchema.optional(), 
  orderBy: z.union([ RoomOrderByWithRelationInputSchema.array(), RoomOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomScalarFieldEnumSchema, RoomScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomFindManyArgsSchema: z.ZodType<Prisma.RoomFindManyArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereInputSchema.optional(), 
  orderBy: z.union([ RoomOrderByWithRelationInputSchema.array(), RoomOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomScalarFieldEnumSchema, RoomScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomAggregateArgsSchema: z.ZodType<Prisma.RoomAggregateArgs> = z.object({
  where: RoomWhereInputSchema.optional(), 
  orderBy: z.union([ RoomOrderByWithRelationInputSchema.array(), RoomOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const RoomGroupByArgsSchema: z.ZodType<Prisma.RoomGroupByArgs> = z.object({
  where: RoomWhereInputSchema.optional(), 
  orderBy: z.union([ RoomOrderByWithAggregationInputSchema.array(), RoomOrderByWithAggregationInputSchema ]).optional(),
  by: RoomScalarFieldEnumSchema.array(), 
  having: RoomScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const RoomFindUniqueArgsSchema: z.ZodType<Prisma.RoomFindUniqueArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereUniqueInputSchema, 
}).strict();

export const RoomFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.RoomFindUniqueOrThrowArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereUniqueInputSchema, 
}).strict();

export const RoomParticipantFindFirstArgsSchema: z.ZodType<Prisma.RoomParticipantFindFirstArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereInputSchema.optional(), 
  orderBy: z.union([ RoomParticipantOrderByWithRelationInputSchema.array(), RoomParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomParticipantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomParticipantScalarFieldEnumSchema, RoomParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomParticipantFindFirstOrThrowArgsSchema: z.ZodType<Prisma.RoomParticipantFindFirstOrThrowArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereInputSchema.optional(), 
  orderBy: z.union([ RoomParticipantOrderByWithRelationInputSchema.array(), RoomParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomParticipantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomParticipantScalarFieldEnumSchema, RoomParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomParticipantFindManyArgsSchema: z.ZodType<Prisma.RoomParticipantFindManyArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereInputSchema.optional(), 
  orderBy: z.union([ RoomParticipantOrderByWithRelationInputSchema.array(), RoomParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomParticipantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RoomParticipantScalarFieldEnumSchema, RoomParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const RoomParticipantAggregateArgsSchema: z.ZodType<Prisma.RoomParticipantAggregateArgs> = z.object({
  where: RoomParticipantWhereInputSchema.optional(), 
  orderBy: z.union([ RoomParticipantOrderByWithRelationInputSchema.array(), RoomParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: RoomParticipantWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const RoomParticipantGroupByArgsSchema: z.ZodType<Prisma.RoomParticipantGroupByArgs> = z.object({
  where: RoomParticipantWhereInputSchema.optional(), 
  orderBy: z.union([ RoomParticipantOrderByWithAggregationInputSchema.array(), RoomParticipantOrderByWithAggregationInputSchema ]).optional(),
  by: RoomParticipantScalarFieldEnumSchema.array(), 
  having: RoomParticipantScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const RoomParticipantFindUniqueArgsSchema: z.ZodType<Prisma.RoomParticipantFindUniqueArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereUniqueInputSchema, 
}).strict();

export const RoomParticipantFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.RoomParticipantFindUniqueOrThrowArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereUniqueInputSchema, 
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

export const SubscriptionFindFirstArgsSchema: z.ZodType<Prisma.SubscriptionFindFirstArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereInputSchema.optional(), 
  orderBy: z.union([ SubscriptionOrderByWithRelationInputSchema.array(), SubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: SubscriptionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SubscriptionScalarFieldEnumSchema, SubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SubscriptionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SubscriptionFindFirstOrThrowArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereInputSchema.optional(), 
  orderBy: z.union([ SubscriptionOrderByWithRelationInputSchema.array(), SubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: SubscriptionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SubscriptionScalarFieldEnumSchema, SubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SubscriptionFindManyArgsSchema: z.ZodType<Prisma.SubscriptionFindManyArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereInputSchema.optional(), 
  orderBy: z.union([ SubscriptionOrderByWithRelationInputSchema.array(), SubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: SubscriptionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SubscriptionScalarFieldEnumSchema, SubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const SubscriptionAggregateArgsSchema: z.ZodType<Prisma.SubscriptionAggregateArgs> = z.object({
  where: SubscriptionWhereInputSchema.optional(), 
  orderBy: z.union([ SubscriptionOrderByWithRelationInputSchema.array(), SubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: SubscriptionWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SubscriptionGroupByArgsSchema: z.ZodType<Prisma.SubscriptionGroupByArgs> = z.object({
  where: SubscriptionWhereInputSchema.optional(), 
  orderBy: z.union([ SubscriptionOrderByWithAggregationInputSchema.array(), SubscriptionOrderByWithAggregationInputSchema ]).optional(),
  by: SubscriptionScalarFieldEnumSchema.array(), 
  having: SubscriptionScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const SubscriptionFindUniqueArgsSchema: z.ZodType<Prisma.SubscriptionFindUniqueArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereUniqueInputSchema, 
}).strict();

export const SubscriptionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SubscriptionFindUniqueOrThrowArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereUniqueInputSchema, 
}).strict();

export const PaymentHistoryFindFirstArgsSchema: z.ZodType<Prisma.PaymentHistoryFindFirstArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentHistoryOrderByWithRelationInputSchema.array(), PaymentHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentHistoryScalarFieldEnumSchema, PaymentHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentHistoryFindFirstOrThrowArgsSchema: z.ZodType<Prisma.PaymentHistoryFindFirstOrThrowArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentHistoryOrderByWithRelationInputSchema.array(), PaymentHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentHistoryScalarFieldEnumSchema, PaymentHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentHistoryFindManyArgsSchema: z.ZodType<Prisma.PaymentHistoryFindManyArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentHistoryOrderByWithRelationInputSchema.array(), PaymentHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PaymentHistoryScalarFieldEnumSchema, PaymentHistoryScalarFieldEnumSchema.array() ]).optional(),
}).strict();

export const PaymentHistoryAggregateArgsSchema: z.ZodType<Prisma.PaymentHistoryAggregateArgs> = z.object({
  where: PaymentHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentHistoryOrderByWithRelationInputSchema.array(), PaymentHistoryOrderByWithRelationInputSchema ]).optional(),
  cursor: PaymentHistoryWhereUniqueInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const PaymentHistoryGroupByArgsSchema: z.ZodType<Prisma.PaymentHistoryGroupByArgs> = z.object({
  where: PaymentHistoryWhereInputSchema.optional(), 
  orderBy: z.union([ PaymentHistoryOrderByWithAggregationInputSchema.array(), PaymentHistoryOrderByWithAggregationInputSchema ]).optional(),
  by: PaymentHistoryScalarFieldEnumSchema.array(), 
  having: PaymentHistoryScalarWhereWithAggregatesInputSchema.optional(), 
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict();

export const PaymentHistoryFindUniqueArgsSchema: z.ZodType<Prisma.PaymentHistoryFindUniqueArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereUniqueInputSchema, 
}).strict();

export const PaymentHistoryFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.PaymentHistoryFindUniqueOrThrowArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereUniqueInputSchema, 
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

export const ContactCreateArgsSchema: z.ZodType<Prisma.ContactCreateArgs> = z.object({
  select: ContactSelectSchema.optional(),
  data: z.union([ ContactCreateInputSchema, ContactUncheckedCreateInputSchema ]),
}).strict();

export const ContactUpsertArgsSchema: z.ZodType<Prisma.ContactUpsertArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereUniqueInputSchema, 
  create: z.union([ ContactCreateInputSchema, ContactUncheckedCreateInputSchema ]),
  update: z.union([ ContactUpdateInputSchema, ContactUncheckedUpdateInputSchema ]),
}).strict();

export const ContactCreateManyArgsSchema: z.ZodType<Prisma.ContactCreateManyArgs> = z.object({
  data: z.union([ ContactCreateManyInputSchema, ContactCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ContactCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ContactCreateManyAndReturnArgs> = z.object({
  data: z.union([ ContactCreateManyInputSchema, ContactCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const ContactDeleteArgsSchema: z.ZodType<Prisma.ContactDeleteArgs> = z.object({
  select: ContactSelectSchema.optional(),
  where: ContactWhereUniqueInputSchema, 
}).strict();

export const ContactUpdateArgsSchema: z.ZodType<Prisma.ContactUpdateArgs> = z.object({
  select: ContactSelectSchema.optional(),
  data: z.union([ ContactUpdateInputSchema, ContactUncheckedUpdateInputSchema ]),
  where: ContactWhereUniqueInputSchema, 
}).strict();

export const ContactUpdateManyArgsSchema: z.ZodType<Prisma.ContactUpdateManyArgs> = z.object({
  data: z.union([ ContactUpdateManyMutationInputSchema, ContactUncheckedUpdateManyInputSchema ]),
  where: ContactWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ContactUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ContactUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ContactUpdateManyMutationInputSchema, ContactUncheckedUpdateManyInputSchema ]),
  where: ContactWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const ContactDeleteManyArgsSchema: z.ZodType<Prisma.ContactDeleteManyArgs> = z.object({
  where: ContactWhereInputSchema.optional(), 
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

export const MessageCreateArgsSchema: z.ZodType<Prisma.MessageCreateArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  data: z.union([ MessageCreateInputSchema, MessageUncheckedCreateInputSchema ]),
}).strict();

export const MessageUpsertArgsSchema: z.ZodType<Prisma.MessageUpsertArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema, 
  create: z.union([ MessageCreateInputSchema, MessageUncheckedCreateInputSchema ]),
  update: z.union([ MessageUpdateInputSchema, MessageUncheckedUpdateInputSchema ]),
}).strict();

export const MessageCreateManyArgsSchema: z.ZodType<Prisma.MessageCreateManyArgs> = z.object({
  data: z.union([ MessageCreateManyInputSchema, MessageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const MessageCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MessageCreateManyAndReturnArgs> = z.object({
  data: z.union([ MessageCreateManyInputSchema, MessageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const MessageDeleteArgsSchema: z.ZodType<Prisma.MessageDeleteArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema, 
}).strict();

export const MessageUpdateArgsSchema: z.ZodType<Prisma.MessageUpdateArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  data: z.union([ MessageUpdateInputSchema, MessageUncheckedUpdateInputSchema ]),
  where: MessageWhereUniqueInputSchema, 
}).strict();

export const MessageUpdateManyArgsSchema: z.ZodType<Prisma.MessageUpdateManyArgs> = z.object({
  data: z.union([ MessageUpdateManyMutationInputSchema, MessageUncheckedUpdateManyInputSchema ]),
  where: MessageWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const MessageUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.MessageUpdateManyAndReturnArgs> = z.object({
  data: z.union([ MessageUpdateManyMutationInputSchema, MessageUncheckedUpdateManyInputSchema ]),
  where: MessageWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const MessageDeleteManyArgsSchema: z.ZodType<Prisma.MessageDeleteManyArgs> = z.object({
  where: MessageWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomCreateArgsSchema: z.ZodType<Prisma.RoomCreateArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  data: z.union([ RoomCreateInputSchema, RoomUncheckedCreateInputSchema ]),
}).strict();

export const RoomUpsertArgsSchema: z.ZodType<Prisma.RoomUpsertArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereUniqueInputSchema, 
  create: z.union([ RoomCreateInputSchema, RoomUncheckedCreateInputSchema ]),
  update: z.union([ RoomUpdateInputSchema, RoomUncheckedUpdateInputSchema ]),
}).strict();

export const RoomCreateManyArgsSchema: z.ZodType<Prisma.RoomCreateManyArgs> = z.object({
  data: z.union([ RoomCreateManyInputSchema, RoomCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const RoomCreateManyAndReturnArgsSchema: z.ZodType<Prisma.RoomCreateManyAndReturnArgs> = z.object({
  data: z.union([ RoomCreateManyInputSchema, RoomCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const RoomDeleteArgsSchema: z.ZodType<Prisma.RoomDeleteArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  where: RoomWhereUniqueInputSchema, 
}).strict();

export const RoomUpdateArgsSchema: z.ZodType<Prisma.RoomUpdateArgs> = z.object({
  select: RoomSelectSchema.optional(),
  include: RoomIncludeSchema.optional(),
  data: z.union([ RoomUpdateInputSchema, RoomUncheckedUpdateInputSchema ]),
  where: RoomWhereUniqueInputSchema, 
}).strict();

export const RoomUpdateManyArgsSchema: z.ZodType<Prisma.RoomUpdateManyArgs> = z.object({
  data: z.union([ RoomUpdateManyMutationInputSchema, RoomUncheckedUpdateManyInputSchema ]),
  where: RoomWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.RoomUpdateManyAndReturnArgs> = z.object({
  data: z.union([ RoomUpdateManyMutationInputSchema, RoomUncheckedUpdateManyInputSchema ]),
  where: RoomWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomDeleteManyArgsSchema: z.ZodType<Prisma.RoomDeleteManyArgs> = z.object({
  where: RoomWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomParticipantCreateArgsSchema: z.ZodType<Prisma.RoomParticipantCreateArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  data: z.union([ RoomParticipantCreateInputSchema, RoomParticipantUncheckedCreateInputSchema ]),
}).strict();

export const RoomParticipantUpsertArgsSchema: z.ZodType<Prisma.RoomParticipantUpsertArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereUniqueInputSchema, 
  create: z.union([ RoomParticipantCreateInputSchema, RoomParticipantUncheckedCreateInputSchema ]),
  update: z.union([ RoomParticipantUpdateInputSchema, RoomParticipantUncheckedUpdateInputSchema ]),
}).strict();

export const RoomParticipantCreateManyArgsSchema: z.ZodType<Prisma.RoomParticipantCreateManyArgs> = z.object({
  data: z.union([ RoomParticipantCreateManyInputSchema, RoomParticipantCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const RoomParticipantCreateManyAndReturnArgsSchema: z.ZodType<Prisma.RoomParticipantCreateManyAndReturnArgs> = z.object({
  data: z.union([ RoomParticipantCreateManyInputSchema, RoomParticipantCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const RoomParticipantDeleteArgsSchema: z.ZodType<Prisma.RoomParticipantDeleteArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  where: RoomParticipantWhereUniqueInputSchema, 
}).strict();

export const RoomParticipantUpdateArgsSchema: z.ZodType<Prisma.RoomParticipantUpdateArgs> = z.object({
  select: RoomParticipantSelectSchema.optional(),
  include: RoomParticipantIncludeSchema.optional(),
  data: z.union([ RoomParticipantUpdateInputSchema, RoomParticipantUncheckedUpdateInputSchema ]),
  where: RoomParticipantWhereUniqueInputSchema, 
}).strict();

export const RoomParticipantUpdateManyArgsSchema: z.ZodType<Prisma.RoomParticipantUpdateManyArgs> = z.object({
  data: z.union([ RoomParticipantUpdateManyMutationInputSchema, RoomParticipantUncheckedUpdateManyInputSchema ]),
  where: RoomParticipantWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomParticipantUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.RoomParticipantUpdateManyAndReturnArgs> = z.object({
  data: z.union([ RoomParticipantUpdateManyMutationInputSchema, RoomParticipantUncheckedUpdateManyInputSchema ]),
  where: RoomParticipantWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const RoomParticipantDeleteManyArgsSchema: z.ZodType<Prisma.RoomParticipantDeleteManyArgs> = z.object({
  where: RoomParticipantWhereInputSchema.optional(), 
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

export const SubscriptionCreateArgsSchema: z.ZodType<Prisma.SubscriptionCreateArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  data: z.union([ SubscriptionCreateInputSchema, SubscriptionUncheckedCreateInputSchema ]),
}).strict();

export const SubscriptionUpsertArgsSchema: z.ZodType<Prisma.SubscriptionUpsertArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereUniqueInputSchema, 
  create: z.union([ SubscriptionCreateInputSchema, SubscriptionUncheckedCreateInputSchema ]),
  update: z.union([ SubscriptionUpdateInputSchema, SubscriptionUncheckedUpdateInputSchema ]),
}).strict();

export const SubscriptionCreateManyArgsSchema: z.ZodType<Prisma.SubscriptionCreateManyArgs> = z.object({
  data: z.union([ SubscriptionCreateManyInputSchema, SubscriptionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SubscriptionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SubscriptionCreateManyAndReturnArgs> = z.object({
  data: z.union([ SubscriptionCreateManyInputSchema, SubscriptionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const SubscriptionDeleteArgsSchema: z.ZodType<Prisma.SubscriptionDeleteArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  where: SubscriptionWhereUniqueInputSchema, 
}).strict();

export const SubscriptionUpdateArgsSchema: z.ZodType<Prisma.SubscriptionUpdateArgs> = z.object({
  select: SubscriptionSelectSchema.optional(),
  include: SubscriptionIncludeSchema.optional(),
  data: z.union([ SubscriptionUpdateInputSchema, SubscriptionUncheckedUpdateInputSchema ]),
  where: SubscriptionWhereUniqueInputSchema, 
}).strict();

export const SubscriptionUpdateManyArgsSchema: z.ZodType<Prisma.SubscriptionUpdateManyArgs> = z.object({
  data: z.union([ SubscriptionUpdateManyMutationInputSchema, SubscriptionUncheckedUpdateManyInputSchema ]),
  where: SubscriptionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SubscriptionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.SubscriptionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ SubscriptionUpdateManyMutationInputSchema, SubscriptionUncheckedUpdateManyInputSchema ]),
  where: SubscriptionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const SubscriptionDeleteManyArgsSchema: z.ZodType<Prisma.SubscriptionDeleteManyArgs> = z.object({
  where: SubscriptionWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentHistoryCreateArgsSchema: z.ZodType<Prisma.PaymentHistoryCreateArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  data: z.union([ PaymentHistoryCreateInputSchema, PaymentHistoryUncheckedCreateInputSchema ]),
}).strict();

export const PaymentHistoryUpsertArgsSchema: z.ZodType<Prisma.PaymentHistoryUpsertArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereUniqueInputSchema, 
  create: z.union([ PaymentHistoryCreateInputSchema, PaymentHistoryUncheckedCreateInputSchema ]),
  update: z.union([ PaymentHistoryUpdateInputSchema, PaymentHistoryUncheckedUpdateInputSchema ]),
}).strict();

export const PaymentHistoryCreateManyArgsSchema: z.ZodType<Prisma.PaymentHistoryCreateManyArgs> = z.object({
  data: z.union([ PaymentHistoryCreateManyInputSchema, PaymentHistoryCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const PaymentHistoryCreateManyAndReturnArgsSchema: z.ZodType<Prisma.PaymentHistoryCreateManyAndReturnArgs> = z.object({
  data: z.union([ PaymentHistoryCreateManyInputSchema, PaymentHistoryCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict();

export const PaymentHistoryDeleteArgsSchema: z.ZodType<Prisma.PaymentHistoryDeleteArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  where: PaymentHistoryWhereUniqueInputSchema, 
}).strict();

export const PaymentHistoryUpdateArgsSchema: z.ZodType<Prisma.PaymentHistoryUpdateArgs> = z.object({
  select: PaymentHistorySelectSchema.optional(),
  include: PaymentHistoryIncludeSchema.optional(),
  data: z.union([ PaymentHistoryUpdateInputSchema, PaymentHistoryUncheckedUpdateInputSchema ]),
  where: PaymentHistoryWhereUniqueInputSchema, 
}).strict();

export const PaymentHistoryUpdateManyArgsSchema: z.ZodType<Prisma.PaymentHistoryUpdateManyArgs> = z.object({
  data: z.union([ PaymentHistoryUpdateManyMutationInputSchema, PaymentHistoryUncheckedUpdateManyInputSchema ]),
  where: PaymentHistoryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentHistoryUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.PaymentHistoryUpdateManyAndReturnArgs> = z.object({
  data: z.union([ PaymentHistoryUpdateManyMutationInputSchema, PaymentHistoryUncheckedUpdateManyInputSchema ]),
  where: PaymentHistoryWhereInputSchema.optional(), 
  limit: z.number().optional(),
}).strict();

export const PaymentHistoryDeleteManyArgsSchema: z.ZodType<Prisma.PaymentHistoryDeleteManyArgs> = z.object({
  where: PaymentHistoryWhereInputSchema.optional(), 
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