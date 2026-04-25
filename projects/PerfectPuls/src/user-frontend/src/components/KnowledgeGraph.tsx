"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { UploadedFile } from "./DocumentsUpload";

type Node = {
  id: string;
  label: string;
  group: "document" | "category" | "term" | "value";
  x: number;
  y: number;
};

type Edge = {
  from: string;
  to: string;
};

// Base graph for the two pre-loaded sample documents
const BASE_NODES: Node[] = [
  // Documents
  { id: "doc-bc", label: "BlueCross Policy", group: "document", x: 300, y: 80 },
  { id: "doc-sl", label: "SunLife Benefits", group: "document", x: 700, y: 80 },

  // Coverage categories
  { id: "cat-physio", label: "Physiotherapy", group: "category", x: 100, y: 220 },
  { id: "cat-dental", label: "Dental", group: "category", x: 280, y: 220 },
  { id: "cat-vision", label: "Vision", group: "category", x: 460, y: 220 },
  { id: "cat-mental", label: "Mental Health", group: "category", x: 640, y: 220 },
  { id: "cat-wellness", label: "Wellness", group: "category", x: 820, y: 220 },

  // Key terms
  { id: "term-deductible", label: "Deductible", group: "term", x: 150, y: 370 },
  { id: "term-copay", label: "Copay", group: "term", x: 330, y: 370 },
  { id: "term-oop", label: "Out-of-Pocket Max", group: "term", x: 510, y: 370 },
  { id: "term-premium", label: "Premium", group: "term", x: 690, y: 370 },
  { id: "term-network", label: "Provider Network", group: "term", x: 860, y: 370 },

  // Values
  { id: "val-ded", label: "$500 / yr", group: "value", x: 150, y: 480 },
  { id: "val-copay", label: "$20 / visit", group: "value", x: 330, y: 480 },
  { id: "val-oop", label: "$2,000 max", group: "value", x: 510, y: 480 },
  { id: "val-prem", label: "$180 / mo", group: "value", x: 690, y: 480 },
  { id: "val-net", label: "In-Network Only", group: "value", x: 860, y: 480 },
];

const BASE_EDGES: Edge[] = [
  { from: "doc-bc", to: "cat-physio" },
  { from: "doc-bc", to: "cat-dental" },
  { from: "doc-bc", to: "cat-vision" },
  { from: "doc-bc", to: "cat-mental" },
  { from: "doc-sl", to: "cat-physio" },
  { from: "doc-sl", to: "cat-wellness" },
  { from: "doc-sl", to: "cat-dental" },
  { from: "cat-physio", to: "term-deductible" },
  { from: "cat-physio", to: "term-copay" },
  { from: "cat-dental", to: "term-copay" },
  { from: "cat-dental", to: "term-oop" },
  { from: "cat-vision", to: "term-copay" },
  { from: "cat-mental", to: "term-oop" },
  { from: "cat-mental", to: "term-network" },
  { from: "cat-wellness", to: "term-premium" },
  { from: "term-deductible", to: "val-ded" },
  { from: "term-copay", to: "val-copay" },
  { from: "term-oop", to: "val-oop" },
  { from: "term-premium", to: "val-prem" },
  { from: "term-network", to: "val-net" },
];

// Extra nodes that appear when a user uploads an additional document
function makeUploadedDocNodes(file: UploadedFile, index: number): { nodes: Node[]; edges: Edge[] } {
  const baseX = 200 + index * 350;
  const docId = `udoc-${file.id}`;
  const termId = `uterm-${file.id}`;
  const valId = `uval-${file.id}`;
  return {
    nodes: [
      { id: docId, label: file.name.replace(/\.(pdf|docx?)$/i, ""), group: "document", x: baseX, y: 600 },
      { id: termId, label: "Claims Process", group: "term", x: baseX, y: 700 },
      { id: valId, label: "30-day turnaround", group: "value", x: baseX, y: 790 },
    ],
    edges: [
      { from: docId, to: "cat-mental" },
      { from: docId, to: termId },
      { from: termId, to: valId },
    ],
  };
}

const GROUP_COLORS: Record<Node["group"], string> = {
  document: "#0d9488",
  category: "#14b8a6",
  term: "#0891b2",
  value: "#6366f1",
};

const GROUP_RADIUS: Record<Node["group"], number> = {
  document: 44,
  category: 36,
  term: 32,
  value: 28,
};

interface Props {
  files: UploadedFile[];
}

export default function KnowledgeGraph({ files }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const extraNodes: Node[] = [];
    const extraEdges: Edge[] = [];
    // Only add user-uploaded (non-sample) docs
    files.forEach((f, i) => {
      const { nodes: n, edges: e } = makeUploadedDocNodes(f, i);
      extraNodes.push(...n);
      extraEdges.push(...e);
    });
    return {
      nodes: [...BASE_NODES, ...extraNodes],
      edges: [...BASE_EDGES, ...extraEdges],
    };
  }, [files]);

  const maxY = Math.max(...nodes.map((n) => n.y)) + 60;
  const maxX = Math.max(...nodes.map((n) => n.x)) + 80;
  const viewBox = `0 0 ${maxX} ${maxY}`;

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Insurance Knowledge Graph</h2>
        <p className="text-sm text-gray-500">
          Visual map of your coverage — relationships between policies, categories, terms, and values.
          Upload documents in the Documents tab to expand the graph.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 bg-white px-5 py-3 rounded-xl shadow text-sm">
        {(Object.entries(GROUP_COLORS) as [Node["group"], string][]).map(([group, color]) => (
          <div key={group} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-gray-600 capitalize">{group}</span>
          </div>
        ))}
      </div>

      {/* SVG Graph */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <svg
          viewBox={viewBox}
          width="100%"
          height={Math.min(maxY, 560)}
          className="min-w-[640px]"
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const isActive =
              hovered === edge.from || hovered === edge.to;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isActive ? "#14b8a6" : "#e2e8f0"}
                strokeWidth={isActive ? 2.5 : 1.5}
                markerEnd="url(#arrow)"
                className="transition-all duration-200"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const r = GROUP_RADIUS[node.group];
            const color = GROUP_COLORS[node.group];
            const isHov = hovered === node.id;
            const words = node.label.split(" ");
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <circle
                  r={isHov ? r + 5 : r}
                  fill={color}
                  opacity={isHov ? 1 : 0.85}
                  style={{ transition: "all 0.2s" }}
                />
                {words.map((word, wi) => (
                  <text
                    key={wi}
                    textAnchor="middle"
                    dy={words.length === 1 ? "0.35em" : wi === 0 ? "-0.2em" : "1em"}
                    fill="white"
                    fontSize={node.group === "document" ? 9 : 8}
                    fontWeight="600"
                  >
                    {word}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {files.length === 0 && (
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-xl px-4 py-3">
          <Share2 className="w-4 h-4 shrink-0" />
          <span>Upload additional documents in the Documents tab to expand this graph with your own policies.</span>
        </div>
      )}
    </div>
  );
}
