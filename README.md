# illenium-appearance

A replacement for clothing resources for various frameworks

<div align='center'><h1><a href='https://docs.illenium.dev/free-resources/illenium-appearance/installation/'>Documentation</a></h3></div>
<br>

<img src="https://i.imgur.com/ltLSMmh.png" alt="illenium-appearance with Tattoos" />

Discord: https://discord.illenium.dev

**Note:** Do **NOT** use the `main` branch as it will most likely be broken for you. NO SUPPORT WILL BE PROVIDED IF YOU USE IT. Only use the [latest release](https://github.com/iLLeniumStudios/illenium-appearance/releases/latest)

## Supported Frameworks

- qb-core
- ESX
- ox_core

## Dependencies

- [qb-core](https://github.com/qbcore-framework/qb-core) (Latest) (Only for qb-core based servers)
- [es_extended](https://github.com/esx-framework/esx-legacy) (Latest) (Only for ESX based servers)
- [ox_core](https://github.com/overextended/ox_core) (experimental) (Only for ox_core based servers)
- [ox_lib](https://github.com/overextended/ox_lib)
- [qb-target](https://github.com/BerkieBb/qb-target) (Optional) (Only for qb-core based servers)

## Features

- Everything from standalone fivem-appearance
- UI from OX Lib
- Player outfits
- Rank based Clothing Rooms for Jobs / Gangs
- Job / Gang locked Stores
- Tattoo's Support
- Hair Textures
- Polyzone Support
- Ped Menu command (/pedmenu) (Configurable)
- Reload Skin command (/reloadskin)
- Improved code quality
- Plastic Surgeons
- qb-target Support
- Skin migration support (qb-clothing / old fivem-appearance / esx_skin)
- Player specific outfit locations (Restricted via CitizenID)
- Makeup Secondary Color
- Blacklist / Limit Components & Props to certain Jobs / Gangs / CitizenIDs / ACEs (Allows you to have VIP clothing on your Server)
- Blacklist / Limit Peds to certain Jobs / Gangs / CitizenIDs / ACEs
- Persist Job / Gang Clothes on reconnects / logout
- Themes Support (Default & QBCore provided out of the box)
- Disable Components / Props Entirely (Clothing as items support)
- One-by-one clothing and accessory browsing with exact single-step texture controls
- Configurable inventory-wearable clothing items

## One-by-one clothing controls and wearable items

The custom appearance UI no longer uses clothing pictures or range sliders for components and props. Use **Previous** and **Next** to move through drawable IDs one at a time. Use **− Texture** and **+ Texture** to change textures by exactly one step. Blacklisted drawable IDs are skipped automatically.

To define a custom inventory clothing item, add it to `Config.ClothingItems` with `components` and `props`. The server validates that the player owns the item before applying it. For ox_inventory, register the item in your inventory item definitions with `client = { export = "illenium-appearance.useClothingItem" }`; the export validates ownership through the server before applying the item. A client event pointing to `illenium-appearance:client:useClothingItem` is also supported. For QBCore or ESX, the resource registers configured items as usable automatically.

Example:

```lua
Config.ClothingItems = {
    ["custom_hoodie"] = {
        label = "Custom Hoodie",
        components = {
            { component_id = 11, drawable = 42, texture = 0 },
        },
        props = {}
    }
}
```

## New Preview (with Tattoos)

https://streamable.com/qev2h7

## Documentation

Read the docs here: https://docs.illenium.dev

## Credits
- Original Script: https://github.com/pedr0fontoura/fivem-appearance
- Tattoo's Support: https://github.com/franfdezmorales/fivem-appearance
- Last Maintained Fork for QB: https://github.com/mirrox1337/aj-fivem-appearance
