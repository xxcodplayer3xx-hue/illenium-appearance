CustomUI = {}

local registeredContexts = {}
local pendingDialogs = {}
local dialogSequence = 0

local function closeFocusedUi()
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end

local function buildContextPayload(context)
    local options = {}
    for index, option in ipairs(context.options or {}) do
        options[index] = {
            title = option.title or option.label or "Option",
            description = option.description,
            icon = option.icon,
            disabled = option.disabled == true,
            hasMenu = option.menu ~= nil
        }
    end

    return {
        id = context.id,
        title = context.title or "Menu",
        description = context.description,
        menu = context.menu,
        options = options
    }
end

--- Display a notification through the custom appearance interface
--- @param data table Notification title, description, type and duration
function CustomUI.Notify(data)
    data = data or {}
    SendNUIMessage({
        action = "custom_notify",
        data = {
            id = data.id,
            title = data.title or "Notification",
            description = data.description or "",
            type = data.type or "inform",
            duration = data.duration or 4500
        }
    })
end

--- Display the custom interaction prompt used by clothing zones
--- @param text string Prompt text
--- @param options table|nil Optional text UI settings
function CustomUI.ShowTextUI(text, options)
    SendNUIMessage({
        action = "custom_text_ui",
        data = {
            visible = true,
            text = text
        }
    })
end

--- Hide the custom interaction prompt
function CustomUI.HideTextUI()
    SendNUIMessage({
        action = "custom_text_ui",
        data = {
            visible = false
        }
    })
end

--- Register a context menu for the custom interface
--- @param context table Context menu definition
function CustomUI.RegisterContext(context)
    registeredContexts[context.id] = context
end

--- Show a registered context menu
--- @param contextId string Context menu identifier
function CustomUI.ShowContext(contextId)
    local context = registeredContexts[contextId]
    if not context then
        return
    end

    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({
        action = "custom_context",
        data = buildContextPayload(context)
    })
end

--- Open a custom input dialog and wait for its result
--- @param title string Dialog title
--- @param fields table Dialog field definitions
--- @return table|nil values submitted values or nil when cancelled
function CustomUI.InputDialog(title, fields)
    dialogSequence = dialogSequence + 1
    local dialogId = tostring(dialogSequence)
    local promiseObject = promise.new()
    pendingDialogs[dialogId] = promiseObject
    local payloadFields = {}

    for index, field in ipairs(fields or {}) do
        local fieldData = {
            index = index,
            type = field.type or "input",
            label = field.label or "Value",
            placeholder = field.placeholder,
            default = field.default,
            required = field.required == true,
            disabled = field.disabled == true,
            options = {}
        }

        for optionIndex, option in ipairs(field.options or {}) do
            if type(option) == "table" then
                fieldData.options[optionIndex] = {
                    label = option.label or tostring(option.value),
                    value = option.value
                }
            else
                fieldData.options[optionIndex] = {
                    label = tostring(option),
                    value = option
                }
            end
        end

        payloadFields[index] = fieldData
    end

    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({
        action = "custom_dialog",
        data = {
            id = dialogId,
            title = title,
            fields = payloadFields
        }
    })

    local result = Citizen.Await(promiseObject)
    pendingDialogs[dialogId] = nil
    return result
end

RegisterNUICallback("custom_ui_context_select", function(data, cb)
    local context = registeredContexts[data.contextId]
    local option = context and context.options and context.options[tonumber(data.index) + 1]
    if not option or option.disabled then
        cb("ok")
        return
    end

    if option.menu then
        CustomUI.ShowContext(option.menu)
        cb("ok")
        return
    end

    closeFocusedUi()
    SendNUIMessage({ action = "custom_context_close", data = {} })
    if option.event then
        TriggerEvent(option.event, option.args)
    elseif option.onSelect then
        option.onSelect(option.args)
    end
    cb("ok")
end)

RegisterNUICallback("custom_ui_context_back", function(data, cb)
    local context = registeredContexts[data.contextId]
    if context and context.menu then
        CustomUI.ShowContext(context.menu)
    else
        closeFocusedUi()
        SendNUIMessage({ action = "custom_context_close", data = {} })
    end
    cb("ok")
end)

RegisterNUICallback("custom_ui_context_close", function(_, cb)
    closeFocusedUi()
    SendNUIMessage({ action = "custom_context_close", data = {} })
    cb("ok")
end)

RegisterNUICallback("custom_ui_dialog_result", function(data, cb)
    local pending = pendingDialogs[data.id]
    if pending then
        pending:resolve(data.cancelled and nil or data.values)
    end
    closeFocusedUi()
    cb("ok")
end)

RegisterNetEvent("illenium-appearance:client:customNotify", function(data)
    CustomUI.Notify(data)
end)

if lib then
    lib.notify = CustomUI.Notify
    lib.showTextUI = CustomUI.ShowTextUI
    lib.hideTextUI = CustomUI.HideTextUI
    lib.registerContext = CustomUI.RegisterContext
    lib.showContext = CustomUI.ShowContext
    lib.inputDialog = CustomUI.InputDialog
end

AddEventHandler("onResourceStop", function(resource)
    if resource ~= GetCurrentResourceName() then
        return
    end

    closeFocusedUi()
    SendNUIMessage({ action = "custom_reset", data = {} })
end)
