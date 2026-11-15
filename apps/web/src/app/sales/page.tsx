'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getData,postData} from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type Sale={_id:string;orderId:string;orderDate:string;customerName:string;product:string;quantity:number;unit:string;unitPriceUgx:number;amountPaidUgx:number;status:string};

export default function Sales(){
 const [rows,setRows]=useState<Sale[]>([]),[error,setError]=useState('');
 const [f,S]=useState({orderId:'S-0001',orderDate:new Date().toISOString().slice(0,10),customerName:'',phone:'',product:'Honey',quantity:'',unit:'kg',unitPriceUgx:'',amountPaidUgx:'0',status:'Enquiry',notes:''});
 async function load(){try{setRows(await getData<Sale[]>('/sales'));setError('')}catch(e){setError(e instanceof Error?e.message:'API unavailable')}}
 useEffect(()=>{load()},[]);
 async function save(e:React.FormEvent){e.preventDefault();try{await postData('/sales',{...f,quantity:Number(f.quantity),unitPriceUgx:Number(f.unitPriceUgx),amountPaidUgx:Number(f.amountPaidUgx)});S({...f,orderId:`S-${String(rows.length+2).padStart(4,'0')}`,customerName:'',quantity:'',unitPriceUgx:'',amountPaidUgx:'0'});await load()}catch(e){setError(e instanceof Error?e.message:'Save failed')}}

 return (
  <div className="shell">
   <NavSidebar />
   <main id="main-content" className="main">
    <h1>Sales &amp; customers</h1>
    <p className="muted">Business operations · UGX</p>
    {error&&<p className="error">{error}</p>}

    <section className="panel">
     <h2>Create sales order</h2>
     <form onSubmit={save}>
      {Object.entries(f).map(([k,v])=>
       <label key={k}>{k}
        <input
         value={v}
         type={['orderDate'].includes(k)?'date':['quantity','unitPriceUgx','amountPaidUgx'].includes(k)?'number':'text'}
         min={['quantity','unitPriceUgx','amountPaidUgx'].includes(k)?0:undefined}
         onChange={e=>S({...f,[k]:e.target.value})}
         required={['orderId','orderDate','customerName','product','quantity','unitPriceUgx'].includes(k)}
        />
       </label>
      )}
      <button className="btn">Save order</button>
     </form>
    </section>

    <section className="panel">
     <h2>Orders</h2>
     <div style={{overflowX:'auto'}}>
      <table>
       <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th><th>Order value</th><th>Balance</th><th>Status</th></tr></thead>
       <tbody>{rows.map(x=><tr key={x._id}>
        <td>{x.orderId}</td>
        <td>{x.orderDate?.slice(0,10)}</td>
        <td>{x.customerName}</td>
        <td>{x.product}</td>
        <td>{x.quantity} {x.unit}</td>
        <td>{(x.quantity*x.unitPriceUgx).toLocaleString()}</td>
        <td>{(x.quantity*x.unitPriceUgx-x.amountPaidUgx).toLocaleString()}</td>
        <td>{x.status}</td>
       </tr>)}</tbody>
      </table>
     </div>
    </section>
   </main>
  </div>
 );
}