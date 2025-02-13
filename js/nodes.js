const createEl = (tag, { props = {}, style = {} } = {}, parent) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    if (parent) parent.appendChild(el);
    return el;
  };
  
  export const createNode = (x, y, editor, nodes, makeDraggableCallback, config = {}) => {
    const id = config.id || crypto.randomUUID();
    const node = createEl("div", {
      props: { id, className: "node absolute bg-white bg-opacity-5 hover:scale-110 active:scale-90 transition border border-[#343740] shadow px-4 py-2 rounded cursor-move select-none" },
      style: { left: `${x}px`, top: `${y}px` }
    });
    node.dataset.id = id;
    
    createEl("div", {
      props: { className: "font-semibold mb-2 text-white", textContent: config.title || "Untitled" }
    }, node);
    
    const inputConnector = createEl("div", {
      props: { className: "node-input-connector bg-blue-500 connector rounded-full absolute" },
      style: { left: "-6px", top: "50%", transform: "translateY(-50%)" }
    }, node);
    
    const rowsContainer = createEl("div", { props: { className: "space-y-2" } }, node);
    
    makeDraggableCallback(node);
    editor.appendChild(node);
    
    const nodeData = { id, element: node, rows: [], inputConnector, rowsContainer };
    nodes.push(nodeData);
    return nodeData;
  };
  
  export const makeDraggable = el => {
    let offsetX, offsetY, isDragging = false;
    el.addEventListener("click", e => {
      el.dispatchEvent(new CustomEvent("nodeToConnect", { detail: { node: el }, bubbles: true }));
    })
    el.addEventListener("mousedown", e => {
      if (e.target.classList.contains("connector")) return;
      isDragging = true;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      el.style.zIndex = 1000;
    });
    document.addEventListener("mousemove", e => {
      if (!isDragging) return;
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
    });
    el.addEventListener("dblclick", () =>
      el.dispatchEvent(new CustomEvent("nodeSelected", { detail: { node: el }, bubbles: true }))
    );
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      el.dispatchEvent(new CustomEvent("updateConnection", { bubbles: true }));
      el.style.zIndex = "";
    });
  };
  
  export const selectNode = (node, sidebar, editor, nodes) => {
    nodes.forEach(n => n.element.classList.remove("border-2", "border-blue-500"));
    node.classList.add("border-2", "border-blue-500");
    sidebar.classList.remove("hidden");
  
    sidebar.querySelector("#nodeTitle").textContent = node.querySelector("div.font-semibold").textContent;
    const nodeItems = sidebar.querySelector("#nodeItems");
    nodeItems.innerHTML = "";
  
    nodes.find(n => n.id === node.dataset.id).rows.forEach(({ row }) => {
      createEl("div", { props: { textContent: row.dataset.id } }, nodeItems);
    });
  
    const { left, top, width, height } = node.getBoundingClientRect();
    const { width: editorWidth, height: editorHeight } = editor.getBoundingClientRect();
    const offsetX = editorWidth / 2 - (left + width / 2);
    const offsetY = editorHeight / 2 - (top + height / 2);
    Object.assign(editor.style, {
      transition: "transform 0.3s",
      transform: `translate(${offsetX}px, ${offsetY}px) scale(1.5)`
    });
  };
  