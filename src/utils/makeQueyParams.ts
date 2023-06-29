export const makeQueryParams = (params: string[], delimiter: string = ",") =>
  params.map(encodeURIComponent).join(delimiter);
