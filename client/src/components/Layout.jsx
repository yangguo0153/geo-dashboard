import React, { useState } from 'react'
import { Layout, Menu, theme } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  StarOutlined,
  SwapOutlined,
  AlertOutlined,
  AccountBookOutlined,
} from '@ant-design/icons'
import { NAV_ITEMS } from '../utils/constants'

const { Header, Sider, Content } = Layout

// Icon mapping
const ICON_MAP = {
  DashboardOutlined,
  StarOutlined,
  SwapOutlined,
  AlertOutlined,
  AccountBookOutlined,
}

/**
 * Main layout component with sidebar navigation
 */
function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token: themeToken } = theme.useToken()

  // Convert NAV_ITEMS to menu items
  const menuItems = NAV_ITEMS.map((item) => {
    const IconComponent = ICON_MAP[item.icon]
    return {
      key: item.key,
      icon: IconComponent ? <IconComponent /> : null,
      label: item.label,
    }
  })

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: themeToken.colorBgContainer,
          borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
        }}
        theme="light"
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          {collapsed ? (
            <span style={{ fontSize: 20, fontWeight: 'bold' }}>智</span>
          ) : (
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              智己 GEO 看板
            </span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: themeToken.colorBgContainer,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {NAV_ITEMS.find((item) => item.key === location.pathname)?.label || '总览'}
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout