export function updateConnections(nodes, connections) {
    connections.forEach((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from.nodeId);
      const toNode = nodes.find((n) => n.id === conn.to.nodeId);
      if (!fromNode || !toNode) return;
      const fromRow = fromNode.rows.find((r) => r.itemId === conn.from.itemId);
      if (!fromRow) return;
      const fromRect = fromRow.outConnector.getBoundingClientRect();
      const toRect = toNode.inputConnector.getBoundingClientRect();
      const startX = fromRect.left + fromRect.width / 2;
      const startY = fromRect.top + fromRect.height / 2;
      const endX = toRect.left + toRect.width / 2;
      const endY = toRect.top + toRect.height / 2;
      conn.line.setAttribute("x1", startX);
      conn.line.setAttribute("y1", startY);
      conn.line.setAttribute("x2", endX);
      conn.line.setAttribute("y2", endY);
    });
  }
  