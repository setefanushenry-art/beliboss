import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Define the 'users' table using Firebase Auth uid as unique identifier
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define 'pharmacy_data' table to store pharmacy state and configurations
export const pharmacyData = pgTable('pharmacy_data', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid)
    .notNull(),
  namaApotek: text('nama_apotek'),
  stateJson: jsonb('state_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  pharmacyData: many(pharmacyData),
}));

export const pharmacyDataRelations = relations(pharmacyData, ({ one }) => ({
  user: one(users, {
    fields: [pharmacyData.userId],
    references: [users.uid],
  }),
}));
