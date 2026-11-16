import { appRouter } from '../index';

/**
 * The access map of every tRPC procedure. A new procedure fails the first
 * test until it is classified here, and each class is then checked against
 * what the procedure really does:
 *
 * - public: no session.
 * - self: any session, only the caller's own account.
 * - client-portal: CLIENT accounts only, keyed on the caller's own Client row.
 * - member: a space member, touching no space data (or only their memberships).
 * - space-scoped: a space member, and every row comes from a space they belong to.
 * - platform-staff: PLATFORM_STAFF_SUBS only.
 */
export type Access = 'public' | 'self' | 'client-portal' | 'member' | 'space-scoped' | 'platform-staff';

const each = (access: Access, paths: string): Record<string, Access> =>
  Object.fromEntries(paths.split(/\s+/).filter(Boolean).map((path) => [path, access]));

export const ACCESS: Record<string, Access> = {
  ...each(
    'public',
    `auth.refresh settings.get admin.settings.get payLink.get payLink.checkout payLink.declare
     magicLink.request magicLink.consume`
  ),
  ...each(
    'self',
    `auth.me auth.logout user.me user.updateProfile user.deleteOwnAccount media.getUploadUrl
     media.getDownloadUrl media.updateAvatar media.updateCover media.removeAvatar media.removeCover`
  ),
  ...each(
    'client-portal',
    `client.me payment.myPayments portal.overview portal.documents portal.documentDownload
     portal.signLink portal.payments portal.checkout portal.manageMaintenance portal.declarePayment`
  ),
  ...each('member', `document.types document.signatureEnabled billing.access space.list space.directory space.create`),
  ...each(
    'space-scoped',
    `client.list client.getById client.create client.update client.transfer client.delete
     payment.list payment.stats payment.getById payment.create payment.createManual payment.setStatus
     payment.delete payment.update payment.cancel payment.sendReminder payment.markExpired payment.retryReceipts
     payment.confirmDeclared payment.rejectDeclared payment.dismissAttention payment.createLink payment.revokeLinks
     document.list document.get document.delete document.import document.update document.setSignature
     document.refreshSignLink document.sendForSignature document.download
     document.previewFacturePrestation document.createFacturePrestation document.previewMaintenance
     document.createMaintenance document.previewBackContractuel document.createBackContractuel
     document.previewAppelDeFonds document.createAppelDeFonds document.previewContratPrestation
     document.createContratPrestation document.previewContratMaintenance document.createContratMaintenance
     document.previewPrestationBarman document.createPrestationBarman document.previewPrestationPhoto
     document.createPrestationPhoto document.previewPrestationVideo document.createPrestationVideo
     document.previewPrestationDesign document.createPrestationDesign document.previewPrestationDev
     document.createPrestationDev document.previewPrestationFormation document.createPrestationFormation
     document.previewPrestationBtp document.createPrestationBtp
     provider.list provider.get provider.create provider.update provider.delete
     catalog.list catalog.create catalog.update catalog.delete
     space.get space.update space.delete space.getMembers space.addMember space.removeMember
     space.updateMemberRole space.leave space.getSettings space.updateSettings space.connectPlume space.disconnectPlume
     mission.list mission.getById mission.create mission.update mission.setPrestations mission.generateQuote
     mission.acceptQuote mission.generateInvoice mission.setStatus mission.attachDocument
     mission.detachDocument mission.createPayment mission.delete revenue.overview`
  ),
  ...each(
    'platform-staff',
    `admin.settings.getAdmin admin.settings.update admin.settings.requestLogoUpload admin.settings.confirmLogoUpload
     admin.getEntities admin.getEntityConfig admin.list admin.get admin.create admin.update admin.delete
     admin.getPermissions admin.setPermissions admin.getUserPermissions admin.getAuditLogs admin.getAllAuditLogs
     settings.getAdmin settings.update settings.requestLogoUpload settings.confirmLogoUpload
     space.setPlatformStudio
     billing.features billing.saveFeature billing.plans billing.savePlan billing.version billing.createDraft
     billing.saveDraft billing.deleteDraft billing.previewPublish billing.publish billing.migrateSubscribers
     billing.overrides billing.createOverride billing.deleteOverride billing.comps billing.saveComp
     billing.deleteComp billing.spaceComps billing.saveSpaceComp billing.deleteSpaceComp billing.subscriptions
     billing.duplicateSubscriptions billing.pushState billing.pushNow`
  ),
};

export type Procedure = { _def: { type: 'query' | 'mutation'; inputs: Array<{ safeParse?: (v: unknown) => any }> } };
export const PROCEDURES = (appRouter as unknown as { _def: { procedures: Record<string, Procedure> } })._def.procedures;
export const paths = (access: Access) => Object.keys(ACCESS).filter((path) => ACCESS[path] === access);

/** A valid input for each space-scoped procedure, pointing at the rows named `clientB`, `paymentB` and so on in `ids`. */
export function inputFor(ids: Record<string, string | undefined>, path: string): unknown {
  const [module, name] = path.split('.') as [string, string];
  const idOf: Record<string, string | undefined> = {
    client: ids.clientB,
    payment: ids.paymentB,
    document: ids.documentB,
    mission: ids.missionB,
    provider: ids.providerB,
    catalog: ids.catalogItemB,
    space: ids.spaceB,
  };
  const line = { description: 'Line', quantity: 1, price: 100, unit_price: 100, unit: 'u', total: 100 };
  const base = {
    id: idOf[module],
    spaceId: ids.spaceB,
    targetSpaceId: ids.spaceB,
    clientId: ids.clientB,
    providerId: ids.providerB,
    missionId: ids.missionB,
    documentId: ids.documentB,
    quoteId: ids.documentB,
    userId: ids.bob,
    email: 'bob@access.test',
    role: 'MEMBER',
    mode: 'move',
    name: 'Renamed',
    description: 'Changed',
    status: 'PAID',
    amount: 1,
    reference: 'REF',
    collectionMethod: 'MANUAL',
    contactFirstName: 'X',
    contactLastName: 'Y',
    companyName: 'Z',
    type: 'devis',
    number: 'IMP-1',
    issuedAt: new Date('2026-01-01'),
    pdfKey: `uploads/${ids.alice}/x.pdf`,
    total: 120,
    signatureStatus: 'signed',
    providers: [{ providerId: ids.providerB, id: ids.providerB, role: 'LEAD', amount: 1 }],
    payment_providers: [{ id: ids.providerB, amount_to_pay: 1 }],
    lines: [{ label: 'Line', description: 'Line', quantity: 1, unitPrice: 100, providerId: ids.providerB }],
    items: [line],
    features: [{ title: 'F', desc: 'D' }],
    invoice_number: 'F-1',
    invoice_date: '2026-01-01',
    due_date: '2026-02-01',
    quote_number: 'D-1',
    quote_date: '2026-01-01',
    validity_date: '2026-02-01',
    maintenance_period: '12 mois',
    contract_reference: 'C-1',
    contract_date: '2026-01-01',
    project_name: 'P',
    valid_until: '2026-02-01',
    global_invoice_ref: 'G-1',
    project_step: 'S',
    tva_rate: 20,
    dueDate: new Date('2026-12-01'),
    kind: 'TOTAL',
    prestations: [{ label: 'Line', description: 'Line', quantity: 1, unitPrice: 100, providerId: ids.providerB }],
    event_date: '2026-01-01',
    event_time: '20:00',
    event_location: 'Paris',
    service_duration: '4h',
    bar_setup_type: 'mobile',
    shoot_date: '2026-01-01',
    shoot_time: '10:00',
    shoot_location: 'Paris',
    shoot_duration: '2h',
    shoot_type: 'portrait',
    video_type: 'clip',
    project_type: 'site',
    delivery_date: '2026-02-01',
    tech_stack: 'ts',
    training_date: '2026-01-01',
    training_time: '09:00',
    training_location: 'Paris',
    training_duration: '1j',
    training_topic: 'T',
    site_address: '1 rue',
    site_name: 'S',
    work_start_date: '2026-01-01',
    work_type: 'W',
  };
  const overrides: Record<string, Record<string, unknown>> = {
    'provider.update': { id: ids.providerB, data: { iban: 'FR76-ATTACKER' } },
    'catalog.create': { name: 'Logo', unitPrice: 300 },
    'catalog.update': { id: ids.catalogItemB, data: { unitPrice: 1 } },
    'client.create': { createCredentials: false },
    'document.setSignature': { status: 'signed', signedAt: new Date('2026-01-02') },
    'space.update': { id: ids.spaceB, name: 'Space B' },
    'payment.update': { description: 'Changed' },
    'mission.update': { providers: undefined },
  };
  if (path === 'space.connectPlume') return { id: ids.spaceB, token: 'attacker-plume-token-0123' };
  if (path === 'space.updateSettings') {
    return { id: ids.spaceB, paymentTermsDays: 5, webhookUrl: 'https://attacker.example.test/in' };
  }
  return { ...base, ...(overrides[path] ?? {}) };
}
