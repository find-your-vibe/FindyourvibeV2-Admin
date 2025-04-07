import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService, EventItem, EventTicket } from '../../core/services/events/event.service';
import { ToasterComponent } from 'src/app/components/toaster/toaster.component';
import { UploadResponse, UploadService } from 'src/app/core/services/cloudinary/upload.service';
import { HttpEventType } from '@angular/common/http';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from 'src/environments/environment';
import { languagesOptions, typeOptions } from 'src/app/utils/constants';

interface CouponItem {
  _id: string,
  code: string,
  value: number,
  expiry: string
}

@Component({
  selector: 'app-edit-event',
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.css']
})
export class EditEventComponent implements OnInit, AfterViewInit {
  @ViewChild(ToasterComponent) toaster!: ToasterComponent;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('locationInput') locationInput!: ElementRef;
  
  event!: EventItem;
  isLoading = true;
  isEditing = false;
  uploadProgress = 0;
  selectedFiles: File[] = [];
  isUploadingVideo:boolean = false;
  uploadProgressVideo:number = 0;
  types:string[] = typeOptions;
  languages:string[] = languagesOptions
  
  // New form controls
  eventForm!: FormGroup;
  newTicket: EventTicket = {
    title: '',
    occupancy: 0,
    seats: 0,
    description: '',
    seatsLeft: 0,
    price: 0,
    ticketDate: null
  };
  
  newCoupon: CouponItem = {
    _id: '',
    code: '',
    value: 0,
    expiry: ''
  };
  
  coupons: CouponItem[] = [];

  private loader = new Loader({
    apiKey: environment.googleMapsApiKey,
    version: "weekly",
    libraries: ["places"]
  });

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private uploadService: UploadService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.loadEvent(eventId);
    }
    
    // Subscribe to upload progress
    this.uploadService.getUploadProgress().subscribe(progress => {
      this.uploadProgress = progress;
    });
  }

  ngAfterViewInit(): void {
    // Wait for the view to be fully initialized
    setTimeout(() => {
      this.initializeAutocomplete();
    }, 500);
  }
  
  

  async initializeAutocomplete() {
    if (!this.locationInput) {
      console.error('Location input is not defined');
      return;
    }
    if (!this.locationInput?.nativeElement) {
      console.error('Location input element not found');
      return;
    }

    setTimeout(()=>{
      const input = this.locationInput.nativeElement;

    if (!(input instanceof HTMLInputElement)) {
      console.error('Element is not an input');
      return;
    }
    try {
      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'in' },
      });
  
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          console.error("No details available for input: '" + place.name + "'");
          return;
        }
  
        // Update form values
        this.eventForm.patchValue({
          location: place.name,
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        });
  
        // Extract city and state
        let city = '';
        let state = '';
        place.address_components?.forEach((component) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
        });
  
        this.eventForm.patchValue({
          city: city,
          state: state
        });
      });
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      this.toaster.showToast('error', 'Failed to load location services');
    }
    })
  }
  
  initForm(): void {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      location: ['', Validators.required],
      venue: [''],
      state: ['', Validators.required],
      city: ['', Validators.required],
      coordinates: this.fb.group({
        lat: [0, Validators.required],
        lng: [0, Validators.required]
      }),
      video: this.fb.group({
        url: [''],
        public_id: ['']
      }),
      priceType: ['', Validators.required],
      paidType: [null],
      startTime: this.fb.array([]),
      endTime: this.fb.array([]),
      date: this.fb.group({
        dateType: ['single'],
        date: ['', Validators.required],
        endDate: [''],
        recurranceDay: ['']
      }),
      type: ['', Validators.required],
      price: [''],
      language: [[]],
      status: ['active'],
      adultsOnly: [false],
      tickets: this.fb.array([]),
      tnc: this.fb.array([]),
    });


    this.eventForm.get('date.dateType')?.valueChanges.subscribe((dateType) => {
      const dateControl = this.eventForm.get('date.date');
      const endDateControl = this.eventForm.get('date.endDate');
      const recurranceDayControl = this.eventForm.get('date.recurranceDay');
    
      // Reset all controls
      dateControl?.clearValidators();
      endDateControl?.clearValidators();
      recurranceDayControl?.clearValidators();
    
      // Set validators based on dateType
      if (dateType === 'single') {
        dateControl?.setValidators([Validators.required]);
      } else if (dateType === 'multiple') {
        dateControl?.setValidators([Validators.required]);
        endDateControl?.setValidators([Validators.required]);
      } else if (dateType === 'recurring') {
        recurranceDayControl?.setValidators([Validators.required]);
      }
    
      // Update validity
      dateControl?.updateValueAndValidity();
      endDateControl?.updateValueAndValidity();
      recurranceDayControl?.updateValueAndValidity();
    });
  }
  
  loadEvent(eventId: string): void {
    this.isLoading = true;
    this.eventService.getEventById(eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.updateForm(event);
        this.isLoading = false;
        this.cdr.detectChanges(); // Add this line to force change detection
      },
      error: (err) => {
        console.error('Error loading event:', err);
        this.toaster.showToast('error', 'Failed to load event details');
        this.router.navigate(['/events']);
      }
    });
  }
  
  updateForm(event: EventItem): void {
    // Clear existing form arrays
    (this.eventForm.get('startTime') as FormArray).clear();
    (this.eventForm.get('endTime') as FormArray).clear();
    (this.eventForm.get('tickets') as FormArray).clear();
    (this.eventForm.get('tnc') as FormArray).clear();
    
    // Update main fields
    this.eventForm.patchValue({
      title: event.title,
      description: event.description,
      location: event.location,
      venue: event.venue || '',
      state: event.state,
      city: event.city,
      type: event.type,
      price: event.price,
      language: event.language || [],
      status: event.status,
      adultsOnly: event.adultsOnly
    });
    
    // Format dates properly for input fields
    this.eventForm.get('date')?.patchValue({
      dateType: event.date.dateType,
      date: this.formatDateForInput(event.date.date),
      endDate: this.formatDateForInput(event.date.endDate || ''),
      recurranceDay: event.date.recurranceDay || ''
    });
    
    // Add start times
    event.startTime.forEach(time => {
      this.addStartTime(time);
    });
    
    // Add end times
    event.endTime.forEach(time => {
      this.addEndTime(time);
    });
    
    // Add tickets
    if (event.tickets && event.tickets.length > 0) {
      event.tickets.forEach(ticket => {
        const ticketCopy = {...ticket};
        // Format ticket date if present
        if (ticketCopy.ticketDate) {
          ticketCopy.ticketDate = new Date(ticketCopy.ticketDate);
        }
        this.addTicket(ticketCopy);
      });
    }
    
    // Add terms and conditions
    if (event.tnc && event.tnc.length > 0) {
      event.tnc.forEach(term => {
        this.addTnC(term);
      });
    }
    
    // Trigger change detection manually
    setTimeout(() => {
      this.cdr.detectChanges();
    });
  }
  
  // Form array getters
  get startTimes(): FormArray {
    return this.eventForm.get('startTime') as FormArray;
  }
  
  get endTimes(): FormArray {
    return this.eventForm.get('endTime') as FormArray;
  }
  
  get ticketsArray(): FormArray {
    return this.eventForm.get('tickets') as FormArray;
  }
  
  get tncArray(): FormArray {
    return this.eventForm.get('tnc') as FormArray;
  }
  
  // Add methods for form arrays
  addStartTime(time: string = ''): void {
    this.startTimes.push(this.fb.control(time, Validators.required));
  }
  
  addEndTime(time: string = ''): void {
    this.endTimes.push(this.fb.control(time, Validators.required));
  }
  
  addTicket(ticket: EventTicket = this.getEmptyTicket()): void {
    const ticketGroup = this.fb.group({
      title: [ticket.title, Validators.required],
      price: [ticket.price, [Validators.required, Validators.min(0)]],
      description: [ticket.description],
      seats: [ticket.seats, [Validators.required, Validators.min(1)]],
      seatsLeft: [ticket.seatsLeft, Validators.min(0)],
      occupancy: [ticket.occupancy],
      ticketDate: [ticket.ticketDate],
      _id: [ticket._id || null]
    });
  
    // Add the group to the array
    this.ticketsArray.push(ticketGroup);
  }
  
  addTnC(tnc: any = { heading: '', text: '' }): void {
    this.tncArray.push(this.fb.group({
      heading: [tnc.heading, Validators.required],
      text: [tnc.text, Validators.required]
    }));
  }
  
  // Helper methods
  getEmptyTicket(): EventTicket {
    return {
      title: '',
      occupancy: 1,
      seats: 1,
      description: '',
      seatsLeft: 1,
      price: 0,
      ticketDate: null
    };
  }
  
  // Remove methods for form arrays
  removeStartTime(index: number): void {
    this.startTimes.removeAt(index);
  }
  
  removeEndTime(index: number): void {
    this.endTimes.removeAt(index);
  }
  
  removeTicket(index: number): void {
    this.ticketsArray.removeAt(index);
  }
  
  removeTnC(index: number): void {
    this.tncArray.removeAt(index);
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    
    if (this.isEditing) {
      // When switching to edit mode, ensure autocomplete is initialized
      setTimeout(() => {
        this.initializeAutocomplete();
      }, 100);
    } else if (this.event._id) {
      // Reload the event to discard changes
      this.loadEvent(this.event._id);
    }
  }

  saveChanges(): void {
    if (!this.event._id) return;
    if (this.eventForm.invalid) {
      this.toaster.showToast('error', 'Please fill all required fields');
      return;
    }
    
    // Update event object with form values
    const updatedEvent = { ...this.event, ...this.eventForm.value };
    
    this.isLoading = true;
    this.eventService.editEvent(this.event._id, updatedEvent).subscribe({
      next: () => {
        this.toaster.showToast('success', 'Event updated successfully');
        this.isEditing = false;
        this.loadEvent(this.event._id!); // Reload to get fresh data
      },
      error: (err) => {
        console.error('Error updating event:', err);
        this.toaster.showToast('error', 'Failed to update event');
        this.isLoading = false;
      }
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    // Reload original data
    if (this.event._id) {
      this.loadEvent(this.event._id);
    }
  }

  onVideoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // Check if a video already exists
      const currentVideo = this.eventForm.get('video')?.value;
      if (currentVideo && currentVideo.url) {
        this.toaster.showToast(
          'error',
          'You can only upload 1 video. Remove the current video first.'
        );
        return;
      }

      const file = input.files[0];

      // Check file size (optional additional restriction)
      const maxVideoSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxVideoSize) {
        this.toaster.showToast('error', 'Video size should be less than 50MB');
        return;
      }

      // Upload the video to the server
      this.isUploadingVideo = true;
      this.uploadService.uploadFile(file).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            // Update upload progress
            this.uploadProgressVideo = Math.round(
              (100 * event.loaded) / event.total
            );
          } else if (event.type === HttpEventType.Response) {
            // Video upload complete
            const response = event.body as UploadResponse;
            if (response.success) {
              this.eventForm.get('video')?.setValue({
                url: response.data.url,
                public_id: response.data.public_id,
              });
              this.toaster.showToast('success', 'Video uploaded successfully');
            }
            this.isUploadingVideo = false;
          }
        },
        error: (error) => {
          console.error('Error uploading video:', error);
          this.toaster.showToast('error', 'Failed to upload video');
          this.isUploadingVideo = false;
          this.uploadProgressVideo = 0;
        },
      });
    }
  }

  removeVideo(): void {
    const currentVideo = this.eventForm.get('video')?.value;
    if (currentVideo && currentVideo.public_id) {
      this.isUploadingVideo = true;
      this.uploadService.deleteUpload(currentVideo.public_id).subscribe({
        next: (success) => {
          if (success) {
            this.eventForm.get('video')?.setValue({});
          } else {
            this.toaster.showToast(
              'error',
              'Failed to remove video from server'
            );
          }
        },
        error: (error) => {
          console.error('Error deleting video from server:', error);
          this.toaster.showToast('error', 'Error removing video');
        },
        complete: () => {
          this.isUploadingVideo = false;
        },
      });
    } else {
      this.eventForm.get('video')?.setValue({});
    }
  }

  handleVideoError(event: any) {
    console.error('Video error:', event);
    this.toaster.showToast('error', 'Could not load video preview');
  }


  removeImage(public_id: string): void {
    if (!this.event._id) return;
    
    // Show loading state
    this.isLoading = true;
    
    // Use the UploadService to delete the image
    this.uploadService.deleteUpload(public_id).subscribe({
      next: (success) => {
        if (success) {
          // Remove the image from the event's image array
          this.event.image = this.event.image.filter(img => img.public_id !== public_id);
          
          // Update the event with the modified image array
          this.eventService.editEvent(this.event._id!, this.event).subscribe({
            next: () => {
              this.toaster.showToast('success', 'Image removed successfully');
              this.isLoading = false;
            },
            error: (err) => {
              console.error('Error updating event after image removal:', err);
              this.toaster.showToast('error', 'Failed to update event after image removal');
              this.isLoading = false;
            }
          });
        } else {
          this.toaster.showToast('error', 'Failed to remove image');
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error removing image:', err);
        this.toaster.showToast('error', 'Failed to remove image');
        this.isLoading = false;
      }
    });
  }
  
  // File upload methods
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }
  
  uploadSelectedFiles(): void {
    if (!this.selectedFiles.length) return;
    
    this.isLoading = true;
    
    // Upload files one by one
    let uploadedCount = 0;
    const totalFiles = this.selectedFiles.length;
    
    const uploadNext = (index: number) => {
      if (index >= totalFiles) {
        // All files uploaded
        this.selectedFiles = [];
        this.fileInput.nativeElement.value = '';
        this.isLoading = false;
        return;
      }
      
      this.uploadService.uploadFile(this.selectedFiles[index]).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.Response) {
            if (event.body && event.body.success) {
              // Add the new image to the event
              if (!this.event.image) {
                this.event.image = [];
              }
              
              this.event.image.push({
                url: event.body.data.secure_url,
                public_id: event.body.data.public_id
              });
              
              uploadedCount++;
              
              if (uploadedCount === totalFiles) {
                // Update event with new images
                this.eventService.editEvent(this.event._id!, this.event).subscribe({
                  next: () => {
                    this.toaster.showToast('success', `${uploadedCount} images uploaded successfully`);
                    this.isLoading = false;
                  },
                  error: (err) => {
                    console.error('Error updating event with new images:', err);
                    this.toaster.showToast('error', 'Failed to update event with new images');
                    this.isLoading = false;
                  }
                });
              } else {
                // Upload next file
                uploadNext(index + 1);
              }
            }
          }
        },
        error: (err) => {
          console.error(`Error uploading file ${this.selectedFiles[index].name}:`, err);
          this.toaster.showToast('error', `Failed to upload ${this.selectedFiles[index].name}`);
          // Continue with next file
          uploadNext(index + 1);
        }
      });
    };
    
    // Start uploading the first file
    uploadNext(0);
  }
  
  // Coupon methods
  addCoupon(): void {
    if (!this.newCoupon.code || this.newCoupon.value <= 0 || !this.newCoupon.expiry) {
      this.toaster.showToast('error', 'Please fill all coupon fields');
      return;
    }
    
    // Here you would call a service method to add the coupon
    // this.couponService.addCoupon(this.event._id!, this.newCoupon).subscribe({...})
    
    // For now, just add to local array
    this.coupons.push({...this.newCoupon, _id: 'temp_' + Date.now()});
    
    // Reset the form
    this.newCoupon = {
      _id: '',
      code: '',
      value: 0,
      expiry: ''
    };
    
    this.toaster.showToast('success', 'Coupon added successfully');
  }
  
  removeCoupon(couponId: string): void {
    // Here you would call a service method to remove the coupon
    // this.couponService.removeCoupon(this.event._id!, couponId).subscribe({...})
    
    // For now, just remove from local array
    this.coupons = this.coupons.filter(c => c._id !== couponId);
    this.toaster.showToast('success', 'Coupon removed successfully');
  }
}