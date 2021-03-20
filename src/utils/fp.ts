export const unzip = <S, T>(data: Array<[S, T]>): [S[], T[]] =>
  Array.from({ length: 2 }, (_, index) =>
    data.map((array) => array[index])
  ) as [S[], T[]];
