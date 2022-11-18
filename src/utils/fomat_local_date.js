export const formatLocalDate = () => {
  const dateNode = new Date(Date.now());
  let dateLocal = new Date(`${dateNode} UTC`);
  if (dateLocal.toString() === "Invalid Date") {
    const arrayDate = dateNode.toLocaleDateString().split("/");
    const newFormat = `${arrayDate[0]}/${arrayDate[1]}/${arrayDate[2]}`;
    const timeDate = dateNode.toLocaleTimeString();
    dateLocal = new Date(`${newFormat} ${timeDate} UTC`);
  }
  return dateLocal ?? Date.now();
};
