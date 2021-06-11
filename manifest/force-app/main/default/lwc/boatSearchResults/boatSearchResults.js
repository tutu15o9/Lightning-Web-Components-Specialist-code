import { LightningElement, wire, api, track } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import {refreshApex} from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {MessageContext, publish} from 'lightning/messageService';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';


// ...
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';
export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [
    {label: 'Name', fieldName: 'Name', type: 'text', editable: 'true'},
    {label: 'Length', fieldName: 'Length__c', type: 'number', editable: 'true'},
    {label: 'Price', fieldName: 'Price__C', type: 'currency', editable: 'true'},
    {label: 'Description', fieldName: 'Description__c', type: 'text', editable: 'true'},
  ];
  boatTypeId = '';
  @track boats;
  isLoading = false;
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method 
  @wire(getBoats, {boatTypeId: '$boatTypeId'})
  wiredBoats(result) { 
    this.boats = result
    this.notifyLoading(false);
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api
  searchBoats(boatTypeId) {
   this.boatTypeId = boatTypeId; 
   this.notifyLoading(true);
  }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  @api
  async refresh() {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    await refreshApex(this.boats)
    this.isLoading = false;
    this.notifyLoading(this.isLoading);
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) {
    this.selectedBoatId = event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    const payload = {recordId: boatId};
    publish(this.messageContext, BOATMC, payload);
  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    // notify loading
    const updatedFields = event.detail.draftValues;
    // Update the records via Apex
    updateBoatList({data: updatedFields})
    .then(() => {
      this.dispatchEvent(new ShowToastEvent({
            title: SUCCESS_TITLE,
            message: MESSAGE_SHIP_IT,
            variant: SUCCESS_VARIANT
          }));
          this.refresh();
          this.template.querySelector('lightning-datatable').draftValues = [];
    })
    .catch(error => {
      this.dispatchEvent(new ShowToastEvent({
            title: ERROR_TITLE,
            message: error,
            variant: ERROR_VARIANT
          }));
    })
    .finally(() => {});
    // // notify loading
    // this.notifyLoading(true);
    // const recordInputs = event.detail.draftValues.slice().map(draft => {
    //   const fields = Object.assign({}, draft);
    //   return {fields};
    // });
    // const promises = recordInputs.map(recordInput => updateRecord(recordInput));
    // Promise.all(promises)
    // .then(() => {
    //   this.dispatchEvent(new ShowToastEvent({
    //     title: SUCCESS_TITLE,
    //     message: MESSAGE_SHIP_IT,
    //     variant: SUCCESS_VARIANT
    //   }));
    //   this.refresh();
    //   this.template.querySelector('lightning-datatable').draftValues = [];
    // })
    // .catch(error => {
    //   this.dispatchEvent(new ShowToastEvent({
    //     title: ERROR_TITLE,
    //     message: error,
    //     variant: ERROR_VARIANT
    //   }));
    // })
    // .finally(() => {});
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) { 
    if(isLoading){
      this.dispatchEvent(new CustomEvent("loading"));
    }else{
      this.dispatchEvent(new CustomEvent("doneLoading"));
    }
  }
}