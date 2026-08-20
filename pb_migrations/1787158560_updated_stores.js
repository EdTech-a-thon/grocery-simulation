/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3800236418")

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select_brand_mode",
    "maxSelect": 1,
    "name": "brandMode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "name",
      "store",
      "both"
    ]
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "bool_coupons_disabled",
    "name": "couponsDisabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "bool_tax_enabled",
    "name": "taxEnabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "number_sales_tax",
    "max": 100,
    "min": 0,
    "name": "salesTax",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3800236418")

  // remove field
  collection.fields.removeById("select_brand_mode")

  // remove field
  collection.fields.removeById("bool_coupons_disabled")

  // remove field
  collection.fields.removeById("bool_tax_enabled")

  // remove field
  collection.fields.removeById("number_sales_tax")

  return app.save(collection)
})
