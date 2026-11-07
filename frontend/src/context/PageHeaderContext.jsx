import { createContext, useContext, useLayoutEffect, useEffect, useState } from "react";

const HeaderStateContext = createContext({});
const SetHeaderContext = createContext(() => {});

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({});

  return (
    <SetHeaderContext.Provider value={setHeader}>
      <HeaderStateContext.Provider value={header}>
        {children}
      </HeaderStateContext.Provider>
    </SetHeaderContext.Provider>
  );
}

// Header dùng hook này để đọc thông tin
export function useHeaderState() {
  return useContext(HeaderStateContext);
}

// Mỗi trang dùng hook này để khai báo header của mình
export function usePageHeader(config) {
  const setHeader = useContext(SetHeaderContext);

  // Cập nhật header mỗi lần trang render (luôn lấy được onClick mới nhất)
  useLayoutEffect(() => {
    setHeader(config);
  });

  // Rời trang thì xóa header
  useEffect(() => () => setHeader({}), [setHeader]);
}