import { z } from 'zod';
import { DocumentItemSchema } from '../types';

export const PrestationDesignInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  project_name: z.string().min(1, 'Le nom du projet est requis'),
  project_type: z.string().min(1, 'Le type de projet est requis'),
  delivery_date: z.string().min(1, 'La date de livraison est requise'),
});

export const PrestationDevInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  project_name: z.string().min(1, 'Le nom du projet est requis'),
  tech_stack: z.string().min(1, 'Les technologies sont requises'),
  delivery_date: z.string().min(1, 'La date de livraison est requise'),
});

export const PrestationFormationInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  training_date: z.string().min(1, 'La date de formation est requise'),
  training_time: z.string().min(1, 'L\'heure de formation est requise'),
  training_location: z.string().min(1, 'Le lieu de formation est requise'),
  training_duration: z.string().min(1, 'La durée de formation est requise'),
  training_topic: z.string().min(1, 'Le sujet de formation est requis'),
});

export const PrestationBtpInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  site_address: z.string().min(1, 'L\'adresse du chantier est requise'),
  site_name: z.string().min(1, 'Le nom du chantier est requis'),
  work_start_date: z.string().min(1, 'La date de début est requise'),
  work_type: z.string().min(1, 'Le type de travaux est requis'),
});

export const PrestationBarmanInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  event_date: z.string().min(1, 'La date de l\'événement est requise'),
  event_time: z.string().min(1, 'L\'heure de l\'événement est requise'),
  event_location: z.string().min(1, 'Le lieu de l\'événement est requis'),
  service_duration: z.string().min(1, 'La durée du service est requise'),
  bar_setup_type: z.string().min(1, 'Le type d\'installation bar est requis'),
});

export const PrestationPhotoInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  shoot_date: z.string().min(1, 'La date du shooting est requise'),
  shoot_time: z.string().min(1, 'L\'heure du shooting est requise'),
  shoot_location: z.string().min(1, 'Le lieu du shooting est requis'),
  shoot_duration: z.string().min(1, 'La durée du shooting est requise'),
  shoot_type: z.string().min(1, 'Le type de shooting est requis'),
});

export const PrestationVideoInputSchema = z.object({
  invoice_date: z.string().min(1, 'La date de facture est requise'),
  due_date: z.string().min(1, 'La date d\'échéance est requise'),
  clientId: z.string().min(1, 'Le client est requis'),
  providerId: z.string().min(1, 'Le prestataire est requis'),
  items: z.array(DocumentItemSchema).min(1, 'Au moins un item est requis'),

  shoot_date: z.string().min(1, 'La date du tournage est requise'),
  shoot_time: z.string().min(1, 'L\'heure du tournage est requise'),
  shoot_location: z.string().min(1, 'Le lieu du tournage est requis'),
  shoot_duration: z.string().min(1, 'La durée du tournage est requise'),
  video_type: z.string().min(1, 'Le type de vidéo est requis'),
});

export type PrestationDesignInput = z.infer<typeof PrestationDesignInputSchema>;
export type PrestationDevInput = z.infer<typeof PrestationDevInputSchema>;
export type PrestationFormationInput = z.infer<typeof PrestationFormationInputSchema>;
export type PrestationBtpInput = z.infer<typeof PrestationBtpInputSchema>;
export type PrestationBarmanInput = z.infer<typeof PrestationBarmanInputSchema>;
export type PrestationPhotoInput = z.infer<typeof PrestationPhotoInputSchema>;
export type PrestationVideoInput = z.infer<typeof PrestationVideoInputSchema>;
