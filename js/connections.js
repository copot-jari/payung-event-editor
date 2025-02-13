export function updateConnections(nodes, connections) {
  const svg = document.getElementById("connections");
  const svgCTM = svg.getScreenCTM();
  connections.forEach((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from.nodeId);
      const toNode = nodes.find((n) => n.id === conn.to.nodeId);
      if (!fromNode || !toNode) return;
      const fromRow = fromNode.rows.find((r) => r.itemId === conn.from.itemId);
      if (!fromRow) return;
      const fromRect = fromRow.outConnector.getBoundingClientRect();
      const toRect = toNode.inputConnector.getBoundingClientRect();
      const startClientX = fromRect.left + fromRect.width / 2;
      const startClientY = fromRect.top + fromRect.height / 2;
      const endClientX = toRect.left + toRect.width / 2;
      const endClientY = toRect.top + toRect.height / 2;
      const startSVG = clientToSvg(svg, svgCTM, startClientX, startClientY);
      const endSVG = clientToSvg(svg, svgCTM, endClientX, endClientY);
      conn.line.setAttribute("x1", startSVG.x);
      conn.line.setAttribute("y1", startSVG.y);
      conn.line.setAttribute("x2", endSVG.x);
      conn.line.setAttribute("y2", endSVG.y);
  });
}

function clientToSvg(svg, svgCTM, clientX, clientY) {
  let pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svgCTM.inverse());
}