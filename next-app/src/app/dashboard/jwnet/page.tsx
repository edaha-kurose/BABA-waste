'use client';

/**
 * JWNET 管理画面
 * 
 * マニフェスト登録・照会・予約番号取得
 */

import React, { useState } from 'react';
import { Card, Tabs, message, Button, Form, Input, InputNumber, Select, DatePicker, Table, Space } from 'antd';
import { FileTextOutlined, SearchOutlined, NumberOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ManifestType } from '@/types/jwnet';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface ManifestRecord {
  key: string;
  manifestNo: string;
  issuedDate: string;
  status: string;
  emitter: string;
  transporter: string;
  disposer: string;
}

export default function JwnetManagementPage() {
  const [registerForm] = Form.useForm();
  const [inquiryForm] = Form.useForm();
  const [reservationForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [manifests, setManifests] = useState<ManifestRecord[]>([]);

  /**
   * マニフェスト登録
   */
  const handleRegisterManifest = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/jwnet/manifest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestType: values.manifestType,
          issuedDate: values.issuedDate.toISOString(),
          emitter: {
            subscriberNo: values.emitterSubscriberNo,
            publicConfirmNo: values.emitterPublicConfirmNo,
            name: values.emitterName,
            postalCode: values.emitterPostalCode,
            address: values.emitterAddress,
            phoneNumber: values.emitterPhone,
          },
          transporter: {
            subscriberNo: values.transporterSubscriberNo,
            publicConfirmNo: values.transporterPublicConfirmNo,
            name: values.transporterName,
            postalCode: values.transporterPostalCode,
            address: values.transporterAddress,
            phoneNumber: values.transporterPhone,
          },
          disposer: {
            subscriberNo: values.disposerSubscriberNo,
            publicConfirmNo: values.disposerPublicConfirmNo,
            name: values.disposerName,
            postalCode: values.disposerPostalCode,
            address: values.disposerAddress,
            phoneNumber: values.disposerPhone,
          },
          wastes: [
            {
              wasteCode: values.wasteCode,
              wasteName: values.wasteName,
              quantity: values.quantity,
              unit: values.unit,
            },
          ],
          remarks: values.remarks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'マニフェスト登録に失敗しました');
      }

      const result = await response.json();
      message.success(`マニフェスト登録成功: ${result.manifestNo}`);
      registerForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  /**
   * マニフェスト照会
   */
  const handleInquireManifest = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/jwnet/manifest/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestNo: values.manifestNo,
          subscriberNo: values.subscriberNo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'マニフェスト照会に失敗しました');
      }

      const result = await response.json();
      message.success('マニフェスト照会成功');
      console.log('Inquiry result:', result);
      // TODO: 照会結果を表示
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 予約番号取得
   */
  const handleReserveNumbers = async (values: any) => {
    setLoading(false);
    try {
      const response = await fetch('/api/jwnet/reservation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberNo: values.subscriberNo,
          publicConfirmNo: values.publicConfirmNo,
          count: values.count,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '予約番号取得に失敗しました');
      }

      const result = await response.json();
      message.success(`予約番号取得成功: ${result.reservationNos?.length}件`);
      reservationForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<ManifestRecord> = [
    { title: 'マニフェスト番号', dataIndex: 'manifestNo', key: 'manifestNo' },
    { title: '交付年月日', dataIndex: 'issuedDate', key: 'issuedDate' },
    { title: 'ステータス', dataIndex: 'status', key: 'status' },
    { title: '排出事業者', dataIndex: 'emitter', key: 'emitter' },
    { title: '運搬受託者', dataIndex: 'transporter', key: 'transporter' },
    { title: '処分受託者', dataIndex: 'disposer', key: 'disposer' },
    {
      title: 'アクション',
      key: 'action',
      render: () => (
        <Space>
          <Button size="small">詳細</Button>
          <Button size="small">照会</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>JWNET 管理</h1>
      <p style={{ marginBottom: '24px', color: '#666' }}>
        産業廃棄物情報ネットワーク (JWNET) との連携管理
      </p>

      <Tabs defaultActiveKey="register">
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              マニフェスト登録
            </span>
          }
          key="register"
        >
          <Card>
            <Form form={registerForm} layout="vertical" onFinish={handleRegisterManifest}>
              <h3>基本情報</h3>
              <Form.Item
                label="マニフェスト種別"
                name="manifestType"
                rules={[{ required: true, message: 'マニフェスト種別を選択してください' }]}
              >
                <Select>
                  <Select.Option value={ManifestType.INDUSTRIAL}>産業廃棄物</Select.Option>
                  <Select.Option value={ManifestType.SPECIAL}>特別管理産業廃棄物</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="交付年月日"
                name="issuedDate"
                rules={[{ required: true, message: '交付年月日を選択してください' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <h3>排出事業者</h3>
              <Form.Item label="加入者番号" name="emitterSubscriberNo" rules={[{ required: true }]}>
                <Input maxLength={7} />
              </Form.Item>
              <Form.Item label="公開確認番号" name="emitterPublicConfirmNo" rules={[{ required: true }]}>
                <Input maxLength={6} />
              </Form.Item>
              <Form.Item label="事業者名" name="emitterName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="郵便番号" name="emitterPostalCode" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="住所" name="emitterAddress" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="電話番号" name="emitterPhone">
                <Input />
              </Form.Item>

              <h3>運搬受託者</h3>
              <Form.Item label="加入者番号" name="transporterSubscriberNo" rules={[{ required: true }]}>
                <Input maxLength={7} />
              </Form.Item>
              <Form.Item label="公開確認番号" name="transporterPublicConfirmNo" rules={[{ required: true }]}>
                <Input maxLength={6} />
              </Form.Item>
              <Form.Item label="事業者名" name="transporterName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="郵便番号" name="transporterPostalCode" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="住所" name="transporterAddress" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="電話番号" name="transporterPhone">
                <Input />
              </Form.Item>

              <h3>処分受託者</h3>
              <Form.Item label="加入者番号" name="disposerSubscriberNo" rules={[{ required: true }]}>
                <Input maxLength={7} />
              </Form.Item>
              <Form.Item label="公開確認番号" name="disposerPublicConfirmNo" rules={[{ required: true }]}>
                <Input maxLength={6} />
              </Form.Item>
              <Form.Item label="事業者名" name="disposerName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="郵便番号" name="disposerPostalCode" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="住所" name="disposerAddress" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="電話番号" name="disposerPhone">
                <Input />
              </Form.Item>

              <h3>廃棄物情報</h3>
              <Form.Item label="廃棄物コード" name="wasteCode" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="廃棄物名称" name="wasteName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="数量" name="quantity" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="単位" name="unit" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="KG">kg</Select.Option>
                  <Select.Option value="L">L</Select.Option>
                  <Select.Option value="M3">m³</Select.Option>
                  <Select.Option value="T">t</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="備考" name="remarks">
                <TextArea rows={4} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  マニフェスト登録
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SearchOutlined />
              マニフェスト照会
            </span>
          }
          key="inquiry"
        >
          <Card>
            <Form form={inquiryForm} layout="vertical" onFinish={handleInquireManifest}>
              <Form.Item
                label="マニフェスト番号"
                name="manifestNo"
                rules={[{ required: true, message: 'マニフェスト番号を入力してください' }]}
              >
                <Input placeholder="マニフェスト番号を入力" />
              </Form.Item>

              <Form.Item
                label="加入者番号"
                name="subscriberNo"
                rules={[{ required: true, message: '加入者番号を入力してください' }]}
              >
                <Input maxLength={7} placeholder="7桁の加入者番号" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  マニフェスト照会
                </Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: '32px' }}>
              <h3>マニフェスト一覧</h3>
              <Table columns={columns} dataSource={manifests} />
            </div>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <NumberOutlined />
              予約番号取得
            </span>
          }
          key="reservation"
        >
          <Card>
            <Form form={reservationForm} layout="vertical" onFinish={handleReserveNumbers}>
              <Form.Item
                label="加入者番号"
                name="subscriberNo"
                rules={[{ required: true, message: '加入者番号を入力してください' }]}
              >
                <Input maxLength={7} placeholder="7桁の加入者番号" />
              </Form.Item>

              <Form.Item
                label="公開確認番号"
                name="publicConfirmNo"
                rules={[{ required: true, message: '公開確認番号を入力してください' }]}
              >
                <Input maxLength={6} placeholder="6桁の公開確認番号" />
              </Form.Item>

              <Form.Item
                label="取得数"
                name="count"
                rules={[
                  { required: true, message: '取得数を入力してください' },
                  {
                    type: 'number',
                    min: 1,
                    max: 100,
                    message: '1〜100の範囲で入力してください',
                  },
                ]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  予約番号取得
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

