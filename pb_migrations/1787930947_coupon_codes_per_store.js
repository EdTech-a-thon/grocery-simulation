/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1681354482")

  // Teachers choose memorable words, so different classrooms should be able
  // to use the same code. A code only needs to be unique inside one store.
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_coupons_store_code ON coupons (store, code)"
  ]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1681354482")
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_coupons_code ON coupons (code)"
  ]

  return app.save(collection)
})
