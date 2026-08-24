import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function CargaDiaTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E1E1E1", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2, color: "#2A2A2A" }}>{label}</div>
      <div style={{ color: "#C99400" }}>{payload[0].value.toLocaleString("es-AR", { maximumFractionDigits: 1 })} tn</div>
    </div>
  );
}

// Sólo etiqueta picos, valles y tramos en 0 (marcados en showLabel) para no saturar el gráfico
// con un número por cada día — así se ve la cantidad exacta en las puntas y quedan resaltados
// los días sin cargas.
function PeakLabel({ x, y, width, value, index, data }) {
  if (!data[index] || !data[index].showLabel) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill="#8A6D00">
      {Math.round(value).toLocaleString("es-AR")}
    </text>
  );
}

export default function CargaDiaChart({ data, target, height }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6B6B6B" }} minTickGap={24} axisLine={{ stroke: "#E1E1E1" }} tickLine={false} />
        <YAxis width={42} tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CargaDiaTooltip />} cursor={{ fill: "#FFF6DB" }} />
        <ReferenceLine y={target} stroke="#3FA34D" strokeWidth={2} strokeDasharray="6 4" />
        <Bar dataKey="tn" fill="#FFC800" radius={[1, 1, 0, 0]} minPointSize={2} isAnimationActive={false}>
          <LabelList dataKey="tn" content={(props) => <PeakLabel {...props} data={data} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
