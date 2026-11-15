function formatChartDate(date) {
  return new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function ScoreLineChart({ results, compact = false }) {
  const chartWidth = 760;
  const chartHeight = compact ? 210 : 300;
  const padding = compact
    ? { top: 20, right: 24, bottom: 38, left: 44 }
    : { top: 24, right: 28, bottom: 44, left: 48 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const graphBottom = padding.top + graphHeight;
  const chronologicalResults = [...results].reverse();
  const gridScores = compact ? [0, 50, 100] : [0, 25, 50, 75, 100];
  const gradientId = compact ? 'score-area-gradient-compact' : 'score-area-gradient';

  const points = chronologicalResults.map((result, index) => ({
    ...result,
    x: chronologicalResults.length === 1
      ? padding.left + graphWidth / 2
      : padding.left + (index * graphWidth) / (chronologicalResults.length - 1),
    y: padding.top + ((100 - result.percentage) / 100) * graphHeight
  }));

  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className={`score-chart-wrapper ${compact ? 'compact-chart-wrapper' : ''}`}>
      <svg
        className={`score-chart ${compact ? 'compact-score-chart' : ''}`}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Interview score percentages over time"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {gridScores.map((score) => {
          const y = padding.top + ((100 - score) / 100) * graphHeight;
          return (
            <g key={score}>
              <line className="chart-grid-line" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={padding.left - 10} y={y + 4} textAnchor="end">{score}%</text>
            </g>
          );
        })}

        {points.length > 1 && (
          <polygon
            className="chart-area"
            style={{ fill: `url(#${gradientId})` }}
            points={`${points[0].x},${graphBottom} ${pointString} ${points[points.length - 1].x},${graphBottom}`}
          />
        )}

        {points.length > 1 && <polyline className="chart-line" points={pointString} />}

        {points.map((point, index) => {
          const tooltipX = Math.min(chartWidth - 52, Math.max(52, point.x));
          const tooltipY = point.y < 58 ? point.y + 38 : point.y - 34;
          const showAxisLabel = index % labelStep === 0 || index === points.length - 1;

          return (
            <g className="chart-point-group" key={point._id} tabIndex="0">
              <title>{`Interview ${index + 1}: ${point.percentage}% on ${formatChartDate(point.completedAt)}`}</title>
              <circle className="chart-point-hitbox" cx={point.x} cy={point.y} r="14" />
              <circle className="chart-point" cx={point.x} cy={point.y} r="5.5" />

              <g className="chart-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
                <rect x="-31" y="-16" width="62" height="28" rx="9" />
                <text x="0" y="3" textAnchor="middle">{point.percentage}%</text>
              </g>

              {showAxisLabel && (
                <text className="chart-axis-label chart-x-label" x={point.x} y={chartHeight - 14} textAnchor="middle">
                  #{index + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default ScoreLineChart;
