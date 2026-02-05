export function downloadCSV<T>(data: T[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0] as object).join(',');

  const rows = data.map((obj) => {
    return Object.values(obj as object)
      .map((value) => {
        const str = String(value).replace(/"/g, '""'); // Échapper les guillemets
        return `"${str}"`; // Envelopper chaque valeur
      })
      .join(',');
  });

  const csvContent = [headers, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
