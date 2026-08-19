/// <reference path="../pb_data/types.d.ts" />

// Join codes used to be whatever a teacher typed, checked for uniqueness across
// the whole site — so the first teacher to claim ROOM-204 claimed it for
// everyone. They are now built from two halves:
//
//   OTTER  -  P3        joinKey: OTTERP3
//   ^ the teacher's     ^ a short label
//     class identifier,   the teacher gives
//     chosen once         each of their classes
//
// The identifier is unique across the site, so a label only has to be unique
// within one teacher — which lets teachers use the period or class name they
// already have in their head, and turns a baffling clash into "you already have
// a class called P3".
//
// Stores are dropped: their old codes cannot be rebuilt in the new shape.
migrate((app) => {
  // ---------------------------------------------------------------- teachers
  const teachers = app.findCollectionByNameOrId('pbc_3614170744')

  teachers.fields.add(new Field({
    autogeneratePattern: '',
    hidden: false,
    id: 'text_join_prefix',
    max: 12,
    min: 0,
    name: 'joinPrefix',
    // Empty until the teacher picks one; 3-12 characters once they have.
    pattern: '^([A-Z0-9]{3,12})?$',
    presentable: false,
    primaryKey: false,
    required: false,
    system: false,
    type: 'text',
  }))

  teachers.indexes = [
    ...teachers.indexes,
    "CREATE UNIQUE INDEX `idx_teachers_join_prefix` ON `teachers` (`joinPrefix`) WHERE `joinPrefix` != ''",
  ]

  // The identifier may be filled in once and is fixed after that: every code
  // already printed for a class is built from it.
  teachers.updateRule =
    'id = @request.auth.id && @request.body.verified:changed = false' +
    ' && (@request.body.joinPrefix:isset = false || joinPrefix = "")'

  app.save(teachers)

  // ------------------------------------------------------------------ stores
  for (const store of app.findAllRecords('stores')) app.delete(store)

  const stores = app.findCollectionByNameOrId('pbc_3800236418')
  stores.fields.removeByName('joinCode')

  stores.fields.add(new Field({
    autogeneratePattern: '',
    hidden: false,
    id: 'text_join_label',
    max: 6,
    min: 1,
    name: 'joinLabel',
    pattern: '^[A-Z0-9]+$',
    presentable: false,
    primaryKey: false,
    required: true,
    system: false,
    type: 'text',
  }))

  // The identifier and the label run together, with no dash. Students type the
  // dash or leave it out as they please; lookups compare on this form.
  stores.fields.add(new Field({
    autogeneratePattern: '',
    hidden: false,
    id: 'text_join_key',
    max: 19,
    min: 4,
    name: 'joinKey',
    pattern: '^[A-Z0-9]+$',
    presentable: false,
    primaryKey: false,
    required: true,
    system: false,
    type: 'text',
  }))

  stores.indexes = [
    'CREATE UNIQUE INDEX `idx_stores_join_key` ON `stores` (`joinKey`)',
    // A teacher cannot reuse one of their own labels. The site-wide index above
    // would catch it too, but this one lets the hook say so in plain words.
    'CREATE UNIQUE INDEX `idx_stores_owner_label` ON `stores` (`owner`, `joinLabel`)',
  ]

  return app.save(stores)
}, (app) => {
  const stores = app.findCollectionByNameOrId('pbc_3800236418')
  for (const store of app.findAllRecords('stores')) app.delete(store)
  stores.fields.removeByName('joinLabel')
  stores.fields.removeByName('joinKey')
  stores.fields.add(new Field({
    autogeneratePattern: '', hidden: false, id: 'text2792196114', max: 20, min: 3,
    name: 'joinCode', pattern: '^[A-Z0-9-]+$', presentable: false, primaryKey: false,
    required: true, system: false, type: 'text',
  }))
  stores.indexes = ['CREATE UNIQUE INDEX idx_stores_join_code ON stores (joinCode)']
  app.save(stores)

  const teachers = app.findCollectionByNameOrId('pbc_3614170744')
  teachers.fields.removeByName('joinPrefix')
  teachers.indexes = teachers.indexes.filter((index) => !index.includes('idx_teachers_join_prefix'))
  teachers.updateRule = 'id = @request.auth.id && @request.body.verified:changed = false'
  return app.save(teachers)
})
