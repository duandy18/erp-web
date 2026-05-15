export type RegisteredApp = {
  code: string;
  name: string;
  description: string;
  webPath: string;
  apiPath: string;
  localWebUrl: string;
  localApiUrl: string;
  status: "ready" | "planned";
};

export const registeredApps: RegisteredApp[] = [
  {
    code: "wms",
    name: "WMS 仓储执行系统",
    description: "库存、入库、出库、仓内执行。",
    webPath: "/wms",
    apiPath: "/api/wms",
    localWebUrl: "http://127.0.0.1:5173",
    localApiUrl: "http://127.0.0.1:8000",
    status: "ready",
  },
  {
    code: "pms",
    name: "PMS 商品主数据系统",
    description: "商品、条码、单位、供应商、SKU 编码。",
    webPath: "/pms",
    apiPath: "/api/pms",
    localWebUrl: "http://127.0.0.1:5174",
    localApiUrl: "http://127.0.0.1:8005",
    status: "ready",
  },
  {
    code: "oms",
    name: "OMS 订单系统",
    description: "平台订单、FSKU、订单投影与履约入口。",
    webPath: "/oms",
    apiPath: "/api/oms",
    localWebUrl: "http://127.0.0.1:5175",
    localApiUrl: "http://127.0.0.1:8010",
    status: "ready",
  },
  {
    code: "procurement",
    name: "Procurement 采购系统",
    description: "采购单、采购履约、WMS 收货联动。",
    webPath: "/procurement",
    apiPath: "/api/procurement",
    localWebUrl: "http://127.0.0.1:5176",
    localApiUrl: "http://127.0.0.1:8015",
    status: "ready",
  },
  {
    code: "logistics",
    name: "Logistics 物流辅助系统",
    description: "发货请求、运价、面单、物流交接。",
    webPath: "/logistics",
    apiPath: "/api/logistics",
    localWebUrl: "http://127.0.0.1:5177",
    localApiUrl: "http://127.0.0.1:8020",
    status: "ready",
  },
];
