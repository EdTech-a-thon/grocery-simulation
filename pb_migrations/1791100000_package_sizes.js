/// <reference path="../pb_data/types.d.ts" />

// Package sizes, so students can compare unit prices.
//
// stores.unitPricing — what a shelf tag shows besides the price: the size and
//   the unit price ('unit'), the size alone ('size'), or neither ('off'). Left
//   empty, as it is on every store that already exists, it means 'unit'.
//
// store_items.sizeAmount / sizeUnit — a teacher's own size for one product in
//   one store. An amount of 0 means "use the catalog size" (src/lib/sizes.ts).
migrate((app) => {
  const stores = app.findCollectionByNameOrId("pbc_3800236418")
  stores.fields.add(new Field({
    "hidden": false,
    "id": "select_unit_pricing",
    "maxSelect": 1,
    "name": "unitPricing",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["unit", "size", "off"]
  }))
  app.save(stores)

  const items = app.findCollectionByNameOrId("pbc_1842453536")
  items.fields.add(new Field({
    "hidden": false,
    "id": "number_size_amount",
    "max": 100000,
    "min": 0,
    "name": "sizeAmount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))
  items.fields.add(new Field({
    "hidden": false,
    "id": "select_size_unit",
    "maxSelect": 1,
    "name": "sizeUnit",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    // Keep in step with sizeUnits in src/lib/sizes.ts.
    "values": ["oz", "fl oz", "lb", "gal", "ct"]
  }))
  return app.save(items)
}, (app) => {
  const stores = app.findCollectionByNameOrId("pbc_3800236418")
  stores.fields.removeById("select_unit_pricing")
  app.save(stores)

  const items = app.findCollectionByNameOrId("pbc_1842453536")
  items.fields.removeById("number_size_amount")
  items.fields.removeById("select_size_unit")
  return app.save(items)
})
