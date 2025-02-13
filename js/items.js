let itemIdCounter = 0;
export function createRow(nodeData, details = {}, svg, nodes, connections) {
    const node = nodeData.element;
    const row = document.createElement("div");
    row.className = "flex items-center justify-between border gap-2 bg-[#030712] border-[#343740] p-1 rounded";
    row.dataset.itemId = "item-" + itemIdCounter++;
    const content = document.createElement("div");
    content.textContent = details.title || "Choice " + row.dataset.itemId;
    content.className = "truncate"
    attachEditButton(row);
    enableItemEditing(row);
    row.appendChild(content);
    const outConnector = document.createElement("div");
    outConnector.className = "connector bg-red-500 rounded-full cursor-pointer";
    row.appendChild(outConnector);
    row.itemDetails = details;
    nodeData.rowsContainer.appendChild(row);
    nodeData.rows.push({
        itemId: row.dataset.itemId,
        row,
        outConnector
    });
    if (details.connectionTarget) {
        const targetNode = nodes.find(n => n.id === details.connectionTarget);
        if (targetNode) {
            const rect = outConnector.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            const targetRect = targetNode.inputConnector.getBoundingClientRect();
            const endX = targetRect.left + targetRect.width / 2;
            const endY = targetRect.top + targetRect.height / 2;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", startX);
            line.setAttribute("y1", startY);
            line.setAttribute("x2", endX);
            line.setAttribute("y2", endY);
            line.setAttribute("stroke", "white");
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
            connections.push({
                from: {
                    nodeId: nodeData.id,
                    itemId: row.dataset.itemId
                },
                to: {
                    nodeId: details.connectionTarget
                },
                line
            });
        }
    }
}
export function removeRow(nodeData, connections, row, svg) {
    console.log(row)
    const itemId = row.dataset.itemId;
    for (let i = connections.length - 1; i >= 0; i--) {
        const connection = connections[i];
        if (connection.from.nodeId === nodeData.id && connection.from.itemId === itemId) {
            if (connection.line && connection.line.parentNode === svg) {
                svg.removeChild(connection.line);
            }
            connections.splice(i, 1);
        }
    }
    if (row.parentNode) {
        row.parentNode.removeChild(row);
    }
    const rowIndex = nodeData.rows.findIndex(item => item.itemId === itemId);
    if (rowIndex !== -1) {
        nodeData.rows.splice(rowIndex, 1);
    }
}
export function enableItemEditing(row) {
    let contentDiv = row.querySelector(".editable");
    if (!contentDiv) {
        contentDiv = row.firstElementChild;
        contentDiv.classList.add("editable");
    }
}
export function attachEditButton(row) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className =
        "ml-2 bg-yellow-500 text-white px-2 py-1 rounded text-sm";
    row.appendChild(editBtn);
    editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const event = new CustomEvent("editItem", {
            detail: {
                row
            },
            bubbles: true
        });
        row.dispatchEvent(event);
    });
}