import { computed, readonly } from 'vue'
import { useTimelineStore } from '../stores/timelineStore.js'
import { storeToRefs } from 'pinia'

export function useDragConnection() {
    const store = useTimelineStore()

    const { connectionDragState, connectionSnapState, enableConnectionTool, validConnectionTargetIds, actionMap, effectsMap, connections, toggleConnectionTool } = storeToRefs(store)
    const isDragging = computed(() => {
        return connectionDragState.value.isDragging
    })

    function snapTo(targetId, port, pos) {
        connectionSnapState.value = {
            isActive: true,
            targetId,
            targetPort: port,
            snapPos: pos,
        }
    }

    function clearSnap() {
        connectionSnapState.value = {
            isActive: false,
            targetId: null,
            targetPort: null,
            snapPos: null
        }
    }

    function calculateValidTargets(sourceId) {
        const validSet = new Set()

        for (const action of actionMap.value.values()) {
            if (validateConnection(sourceId, action.id)) {
                validSet.add(action.id)
            }
        }

        for (const effect of effectsMap.value.values()) {
            if (validateConnection(sourceId, effect.id)) {
                validSet.add(effect.id)
            }
        }

        validConnectionTargetIds.value = validSet
    }

    function isNodeValid(targetId) {
        if (!isDragging.value) {
            return true
        }
        return validConnectionTargetIds.value.has(targetId)
    }

    function startDrag(payload) {
        connectionDragState.value = {
            isDragging: true,
            mode: payload.mode || 'create',
            sourceId: payload.sourceId,
            existingConnectionId: payload.existingConnectionId,
            startPoint: { x: payload.startX || 0, y: payload.startY || 0 },
            sourcePort: payload.sourcePort,
        }

        calculateValidTargets(payload.sourceId)

        clearSnap()
    }

    function handleLinkDrop(fromNode, toNode, targetPort, connectionData) {
        const state = connectionDragState.value

        let isConsumption = false
        if (state.existingConnectionId) {
            const connection = store.getConnectionById(state.existingConnectionId)
            if (connection) {
                isConsumption = connection.isConsumption
                store.removeConnection(state.existingConnectionId)
            }
        }

        store.createConnection(state.sourcePort, targetPort, isConsumption, connectionData)
    }

    function validateConnection(fromId, toId) {
        if (!fromId || !toId || fromId === toId) {
            return false
        }

        const fromNode = store.resolveNode(fromId)
        const toNode = store.resolveNode(toId)

        if (!fromNode || !toNode) {
            return false
        }

        let from = null
        let to = null
        let fromEffectIndex = null
        let toEffectIndex = null
        let fromEffectId = null
        let toEffectId = null

        let fromActionId = null
        let toActionId = null

        if (fromNode.type === 'action') {
            from = fromNode.id
            fromActionId = fromNode.id
        } else if (fromNode.type === 'effect') {
            from = fromNode.actionId
            fromEffectId = fromNode.id
            fromEffectIndex = fromNode.flatIndex
            fromActionId = fromNode.actionId
        }

        if (toNode.type === 'action') {
            to = toNode.id
            toActionId = toNode.id
        } else if (toNode.type === 'effect') {
            to = toNode.actionId
            toEffectId = toNode.id
            toEffectIndex = toNode.flatIndex
            toActionId = toNode.actionId
        }

        if (fromActionId === toActionId) {
            return false
        }

        const exists = connections.value.some(c =>
            c.from === from && c.to === to &&
            (c.fromEffectId ? c.fromEffectId === fromEffectId : c.fromEffectIndex === fromEffectIndex) &&
            (c.toEffectId ? c.toEffectId === toEffectId : c.toEffectIndex === toEffectIndex)
        )

        if (exists) {
            return false
        }

        return {
            from,
            to,
            fromEffectIndex,
            toEffectIndex,
            fromEffectId,
            toEffectId,
        }
    }

    function endDrag(targetId = null, targetPort = null) {
        if (!isDragging.value) {
            return
        }

        const state = connectionDragState.value

        let finalTargetId = targetId
        let finalPort = targetPort

        if (connectionSnapState.value.isActive && !finalTargetId) {
            finalTargetId = connectionSnapState.value.targetId
            finalPort = connectionSnapState.value.targetPort
        }

        const fromNode = store.resolveNode(state.sourceId)
        const toNode = store.resolveNode(finalTargetId)

        if (fromNode && toNode) {
            const connectionData = validateConnection(state.sourceId, finalTargetId)
            if (connectionData) {
                handleLinkDrop(fromNode, toNode, finalPort, connectionData)
            }
        }

        cancelDrag()
        clearSnap()
    }


    function newConnectionFrom(startPos, sourceId, sourcePort) {
        startDrag({
            mode: 'create',
            sourceId,
            sourcePort,
            startX: startPos.x,
            startY: startPos.y
        })
    }

    function moveConnectionEnd(connectionId, startPos) {
        const connection = store.getConnectionById(connectionId)
        if (!connection) {
            return
        }
        const nodes = store.getNodesOfConnection(connectionId)
        if (!nodes.fromNode || !nodes.toNode) {
            return
        }
        const linkDragConfig = {
            mode: 'create',
            sourceId: nodes.fromNode.id,
            existingConnectionId: connectionId,
            sourcePort: connection.sourcePort,
            startX: startPos.x,
            startY: startPos.y
        }

        startDrag(linkDragConfig)
    }

    function cancelDrag() {
        if (connectionDragState.value.existingConnectionId) {
            store.removeConnection(connectionDragState.value.existingConnectionId)
        }

        connectionDragState.value.isDragging = false;
        connectionDragState.value.sourceId = null;
        validConnectionTargetIds.value = new Set()
    }

    return {
        isDragging,
        toolEnabled: readonly(enableConnectionTool),
        state: readonly(connectionDragState),
        snapState: readonly(connectionSnapState),
        snapTo,
        clearSnap,
        newConnectionFrom,
        moveConnectionEnd,
        endDrag,
        cancelDrag,
        validateConnection,
        isNodeValid
    }
}
