import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function DespachosTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E1E1E1", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2, color: "#2A2A2A" }}>{label}</div>
      <div style={{ color: "#1E9BF0" }}>{payload[0].value.toLocaleString("es-AR", { maximumFractionDigits: 1 })} tn</div>
    </div>
  );
}

export default function DespachosChart({ data, height }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="despachosFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1E9BF0" stopOpacity={0.55} />
            <stop offset="95%" stopColor="#1E9BF0" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6B6B6B" }} minTickGap={24} axisLine={{ stroke: "#E1E1E1" }} tickLine={false} />
        <YAxis width={42} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
        <Tooltip content={<DespachosTooltip />} />
        <Area type="monotone" dataKey="tn" stroke="#1E9BF0" strokeWidth={2} fillOpacity={1} fill="url(#despachosFill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
