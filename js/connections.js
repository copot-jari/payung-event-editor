export function updateConnections(connections) {
  const nodes = window.nodes;
  const svg = document.getElementById("connections");
  if (!svg) return; 
  const svgCTM = svg.getScreenCTM();
  if (!svgCTM) return; 
  
  connections.forEach((conn) => {
      if (!conn.line) return; 
      const fromNode = nodes.find((n) => n.id === conn.from.nodeId);
      const toNode = nodes.find((n) => n.id === conn.to.nodeId);
      if (!fromNode || !toNode) return;
      
      const fromRow = fromNode.rows.find((r) => r.itemId === conn.from.itemId);
      if (!fromRow || !fromRow.outConnector) return;
      const fromRect = fromRow.outConnector.getBoundingClientRect();
      
      if (!toNode.inputConnector) return;
      const toRect = toNode.inputConnector.getBoundingClientRect();
      
      const startClientX = fromRect.left + fromRect.width / 2;
      const startClientY = fromRect.top + fromRect.height / 2;
      const endClientX = toRect.left + toRect.width / 2;
      const endClientY = toRect.top + toRect.height / 2;
      
      const startSVG = clientToSvg(svg, svgCTM, startClientX, startClientY);
      const endSVG = clientToSvg(svg, svgCTM, endClientX, endClientY);
      
      try {
          conn.line.setAttribute("x1", startSVG.x);
          conn.line.setAttribute("y1", startSVG.y);
          conn.line.setAttribute("x2", endSVG.x);
          conn.line.setAttribute("y2", endSVG.y);
      } catch (e) {
          console.warn("Failed to update connection line attributes", e);
      }
  });
}

function clientToSvg(svg, svgCTM, clientX, clientY) {
  let pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svgCTM.inverse());
}