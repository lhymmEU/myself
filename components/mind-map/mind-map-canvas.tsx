"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeMouseHandler,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { LifeNode } from "./life-node";
import { Toolbar } from "./toolbar";
import { NodeDetailPanel, type NodeData } from "./node-detail-panel";
import type { LifeNode as LifeNodeType } from "@/lib/modules/mind-map/types";

function lifeNodeToFlowNode(
  node: LifeNodeType,
  onEdit: (id: string) => void
): Node {
  return {
    id: node.id,
    type: "lifeNode",
    position: { x: node.positionX, y: node.positionY },
    data: {
      label: node.label,
      type: node.type,
      color: node.color,
      metadata: node.metadata,
      onEdit,
    },
  };
}

function lifeNodesToEdges(nodes: LifeNodeType[]): Edge[] {
  const edges: Edge[] = [];
  for (const node of nodes) {
    for (const targetId of node.connections) {
      edges.push({
        id: `${node.id}->${targetId}`,
        source: node.id,
        target: targetId,
        animated: true,
        style: { stroke: node.color, strokeWidth: 2 },
      });
    }
  }
  return edges;
}

export function MindMapCanvas() {
  const nodeTypes: NodeTypes = useMemo(() => ({ lifeNode: LifeNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const rawNodesRef = useRef<LifeNodeType[]>([]);

  const handleEditNode = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const loadNodes = useCallback(async () => {
    const res = await fetch("/api/mind-map");
    const data: LifeNodeType[] = await res.json();
    rawNodesRef.current = data;
    setNodes(data.map((n) => lifeNodeToFlowNode(n, handleEditNode)));
    setEdges(lifeNodesToEdges(data));
  }, [setNodes, setEdges, handleEditNode]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const handleAdd = useCallback(
    async (data: { label: string; type: "category" | "item"; color: string }) => {
      const positionX = 100 + Math.random() * 600;
      const positionY = 100 + Math.random() * 400;

      const res = await fetch("/api/mind-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, positionX, positionY }),
      });
      const created: LifeNodeType = await res.json();
      rawNodesRef.current = [...rawNodesRef.current, created];
      setNodes((prev) => [
        ...prev,
        lifeNodeToFlowNode(created, handleEditNode),
      ]);
    },
    [setNodes, handleEditNode]
  );

  const handleNodeDragStop: NodeMouseHandler = useCallback(
    async (_event, node) => {
      await fetch("/api/mind-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        }),
      });
      rawNodesRef.current = rawNodesRef.current.map((n) =>
        n.id === node.id
          ? { ...n, positionX: node.position.x, positionY: node.position.y }
          : n
      );
    },
    []
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      const res = await fetch("/api/mind-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          sourceId: connection.source,
          targetId: connection.target,
        }),
      });
      const updated: LifeNodeType = await res.json();
      rawNodesRef.current = rawNodesRef.current.map((n) =>
        n.id === updated.id ? updated : n
      );

      const newEdge: Edge = {
        id: `${connection.source}->${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        animated: true,
        style: { stroke: updated.color, strokeWidth: 2 },
      };
      setEdges((prev) => [...prev, newEdge]);
    },
    [setEdges]
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        x: (event as unknown as MouseEvent).clientX,
        y: (event as unknown as MouseEvent).clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const handleDeleteNode = useCallback(
    async (id: string) => {
      await fetch(`/api/mind-map?id=${id}`, { method: "DELETE" });
      rawNodesRef.current = rawNodesRef.current.filter((n) => n.id !== id);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => e.source !== id && e.target !== id)
      );
      if (selectedNodeId === id) setSelectedNodeId(null);
      setContextMenu(null);
    },
    [setNodes, setEdges, selectedNodeId]
  );

  const handleUpdateNode = useCallback(
    async (data: Partial<NodeData> & { id: string }) => {
      const res = await fetch("/api/mind-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated: LifeNodeType = await res.json();
      rawNodesRef.current = rawNodesRef.current.map((n) =>
        n.id === updated.id ? updated : n
      );
      setNodes((prev) =>
        prev.map((n) =>
          n.id === updated.id ? lifeNodeToFlowNode(updated, handleEditNode) : n
        )
      );
      setEdges(lifeNodesToEdges(rawNodesRef.current));
    },
    [setNodes, setEdges, handleEditNode]
  );

  const selectedRawNode = rawNodesRef.current.find(
    (n) => n.id === selectedNodeId
  );
  const panelNode: NodeData | null = selectedRawNode
    ? {
        id: selectedRawNode.id,
        label: selectedRawNode.label,
        type: selectedRawNode.type,
        color: selectedRawNode.color,
        connections: selectedRawNode.connections,
        metadata: selectedRawNode.metadata,
      }
    : null;

  const allNodeData: NodeData[] = rawNodesRef.current.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    color: n.color,
    connections: n.connections,
    metadata: n.metadata,
  }));

  return (
    <div className="flex flex-col h-full" onClick={() => setContextMenu(null)}>
      <Toolbar onAdd={handleAdd} />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onNodeContextMenu={handleNodeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
          <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(n) => {
              const data = n.data as { color?: string };
              return data?.color ?? "#6366f1";
            }}
            maskColor="rgba(0,0,0,0.4)"
          />
        </ReactFlow>

        {contextMenu && (
          <div
            className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
              onClick={() => handleDeleteNode(contextMenu.nodeId)}
            >
              Delete Node
            </button>
          </div>
        )}
      </div>

      <NodeDetailPanel
        node={panelNode}
        allNodes={allNodeData}
        onClose={() => setSelectedNodeId(null)}
        onUpdate={handleUpdateNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}
