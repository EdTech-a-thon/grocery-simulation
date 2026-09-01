/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && store.owner = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && store.owner = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3800236418",
        "help": "",
        "hidden": false,
        "id": "relation4283914359",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "store",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1997877400",
        "max": 20,
        "min": 3,
        "name": "code",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2266495210",
        "maxSelect": 1,
        "name": "discountType",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "percent",
          "dollars"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number673137023",
        "max": null,
        "min": 0,
        "name": "discountAmount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text913937925",
        "max": 60,
        "min": 1,
        "name": "productId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date327219409",
        "max": "",
        "min": "",
        "name": "startsAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2466286426",
        "max": "",
        "min": "",
        "name": "endsAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3649033116",
        "max": 100,
        "min": 1,
        "name": "copies",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1681354482",
    "indexes": [
      "CREATE UNIQUE INDEX idx_coupons_code ON coupons (code)"
    ],
    "listRule": "@request.auth.id != \"\" && store.owner = @request.auth.id",
    "name": "coupons",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && store.owner = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && store.owner = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1681354482");

  return app.delete(collection);
})
