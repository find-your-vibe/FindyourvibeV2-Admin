import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, ChangeDetectorRef  } from '@angular/core';
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
export class EditEventComponent implements OnInit, AfterViewInit, AfterViewChecked {
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

  private autocompleteInitialized = false;

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
    // Add a delay to ensure DOM is ready
    setTimeout(() => {
      if (this.locationInput && this.locationInput.nativeElement) {
        this.initializeAutocomplete();
      }
    }, 500);
  }
  
  ngAfterViewChecked(): void {
    // Only try to initialize if:
    // 1. We're in edit mode
    // 2. The autocomplete hasn't been initialized yet
    // 3. The locationInput element is available
    if (this.isEditing && !this.autocompleteInitialized && this.locationInput) {
      this.initializeAutocomplete();
    }
  }

  async initializeAutocomplete() {
    try {
      // Safety check
      if (!this.locationInput || !this.locationInput.nativeElement) {
        return;
      }

      // Set flag to prevent multiple initialization attempts
      this.autocompleteInitialized = true;

      // Load Google Maps API
      await this.loader.load();
      
      const input = this.locationInput.nativeElement;
      
      if (!(input instanceof HTMLInputElement)) {
        console.error('Element is not an input');
        return;
      }

      // Create the autocomplete object
      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'in' },
      });

      // Add the place_changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          console.error('No geometry found for selected place');
          this.eventForm.get('location')?.setErrors({ invalidLocation: true });
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
        
        // Ensure Angular detects the changes
        this.cdr.detectChanges();
      });
      
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      this.toaster.showToast('error', 'Failed to load location services');
      // Reset the flag to allow retry
      this.autocompleteInitialized = false;
    }
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
      priceType: [''],
      paidType: [null],
      startTime: this.fb.array([this.fb.control('', Validators.required)]),
    endTime: this.fb.array([this.fb.control('', Validators.required)]),
    date: this.fb.group({
      dateType: ['single'],
      date: [null], // Initialize as null instead of empty string
      endDate: [null],
      recurranceDay: [null]
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
      const dateGroup = this.eventForm.get('date') as FormGroup;
      
      // Reset all date-related fields
      dateGroup.patchValue({
        date: null,
        endDate: null,
        recurranceDay: null
      });
    
      // Clear validators first
      dateGroup.get('date')?.clearValidators();
      dateGroup.get('endDate')?.clearValidators();
      dateGroup.get('recurranceDay')?.clearValidators();
    
      // Set validators based on dateType
      if (dateType === 'single') {
        dateGroup.get('date')?.setValidators([Validators.required]);
      } else if (dateType === 'multiple') {
        dateGroup.get('date')?.setValidators([Validators.required]);
        dateGroup.get('endDate')?.setValidators([Validators.required]);
      } else if (dateType === 'recurring') {
        dateGroup.get('recurranceDay')?.setValidators([Validators.required]);
      }
    
      // Update validity
      dateGroup.get('date')?.updateValueAndValidity();
      dateGroup.get('endDate')?.updateValueAndValidity();
      dateGroup.get('recurranceDay')?.updateValueAndValidity();
    });
  }
  
  loadEvent(eventId: string): void {
    this.isLoading = true;
    this.eventService.getEventById(eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.updateForm(event);
        
        // Load coupons separately
        this.eventService.getEventCoupons(eventId).subscribe({
          next: (couponsData: any) => {
            this.coupons = couponsData || [];
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading coupons:', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
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

    // Format dates properly for input fields
  const dateData = {
    dateType: event.date.dateType,
    date: event.date.date ? this.formatDateForInput(event.date.date) : null,
    endDate: event.date.endDate ? this.formatDateForInput(event.date.endDate) : null,
    recurranceDay: event.date.recurranceDay || null
  };
  
  this.eventForm.get('date')?.patchValue(dateData);

    
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

    (this.eventForm.get('startTime') as FormArray).clear();
    (this.eventForm.get('endTime') as FormArray).clear();
    
    if (event.startTime && event.startTime.length > 0) {
      event.startTime.forEach(time => {
        this.addStartTime(time);
      });
    } else {
      this.addStartTime('');
    }
    
    // Add end times (if array is empty, add at least one control)
    if (event.endTime && event.endTime.length > 0) {
      event.endTime.forEach(time => {
        this.addEndTime(time);
      });
    } else {
      this.addEndTime('');
    }
    
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
    
    // Reset the initialization flag when toggling edit mode
    if (this.isEditing) {
      this.autocompleteInitialized = false;
      // AfterViewChecked will handle initialization
      this.initializeAutocomplete();
    } else if (this.event._id) {
      this.loadEvent(this.event._id);
    }
  }

  saveChanges(): void {
    if (!this.event._id) return;
  
    // Clean the date object based on dateType
    const dateType = this.eventForm.get('date.dateType')?.value;
    const dateData = this.eventForm.get('date')?.value;
    
    if (dateType === 'single') {
      dateData.endDate = undefined;
      dateData.recurranceDay = undefined;
    } else if (dateType === 'multiple') {
      dateData.recurranceDay = undefined;
    } else if (dateType === 'recurring') {
      dateData.date = undefined;
      dateData.endDate = undefined;
    }
    
    this.eventForm.patchValue({ date: dateData });
  
    // Check form validity
    if (this.eventForm.invalid) {
      // Get all invalid controls
      const invalidControls = this.getInvalidControls(this.eventForm);
      
      // Create a user-friendly message
      let errorMessage = 'Please fill all required fields:';
      
      invalidControls.forEach(controlName => {
        // Map form control names to user-friendly labels
        const fieldLabel = this.getFieldLabel(controlName);
        errorMessage += `\n- ${fieldLabel}`;
      });
  
      // Show toast with specific missing fields
      this.toaster.showToast('error', errorMessage);
      return;
    }
    
    // Proceed with saving if form is valid
    const updatedEvent = { ...this.event, ...this.eventForm.value };
    
    this.isLoading = true;
    this.eventService.editEvent(this.event._id, updatedEvent).subscribe({
      next: () => {
        // After event is saved, save all coupons
        this.saveCoupons(this.event._id!).then(() => {
          this.toaster.showToast('success', 'Event and coupons updated successfully');
          this.isEditing = false;
          this.loadEvent(this.event._id!);
        }).catch(err => {
          console.error('Error saving coupons:', err);
          this.toaster.showToast('warning', 'Event saved but some coupons may not have been saved');
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Error updating event:', err);
        this.toaster.showToast('error', 'Failed to update event');
        this.isLoading = false;
      }
    });
  }
  
  // Helper method to save all coupons
  private async saveCoupons(eventId: string): Promise<void> {
    // Filter out coupons that need to be created (have temp IDs)
    const newCoupons = this.coupons.filter(c => c._id.startsWith('temp_'));
    
    // Create promises for all coupon operations
    const promises = newCoupons.map(coupon => {
      const couponData = {
        code: coupon.code,
        value: coupon.value,
        expiry: coupon.expiry
      };
      return this.eventService.addCoupon(eventId, couponData).toPromise();
    });
    
    // Wait for all promises to resolve
    await Promise.all(promises);
  }
  
  // Helper method to get invalid controls
  private getInvalidControls(form: FormGroup): string[] {
    const invalidControls: string[] = [];
    
    Object.keys(form.controls).forEach(controlName => {
      const control = form.get(controlName);
      
      if (control instanceof FormGroup) {
        // Recursively check nested form groups
        const nestedInvalid = this.getInvalidControls(control);
        nestedInvalid.forEach(nestedControl => {
          invalidControls.push(`${controlName}.${nestedControl}`);
        });
      } else if (control instanceof FormArray) {
        // Check each form array element
        control.controls.forEach((arrayControl, index) => {
          if (arrayControl instanceof FormGroup && arrayControl.invalid) {
            const arrayInvalid = this.getInvalidControls(arrayControl);
            arrayInvalid.forEach(arrayItem => {
              invalidControls.push(`${controlName}[${index}].${arrayItem}`);
            });
          } else if (arrayControl.invalid) {
            invalidControls.push(`${controlName}[${index}]`);
          }
        });
      } else if (control?.invalid) {
        invalidControls.push(controlName);
      }
    });
    
    return invalidControls;
  }
  
  // Helper method to map control names to user-friendly labels
  private getFieldLabel(controlPath: string): string {
    const labelMap: {[key: string]: string} = {
      'title': 'Event Title',
      'description': 'Description',
      'location': 'Location',
      'state': 'State',
      'city': 'City',
      'coordinates.lat': 'Latitude',
      'coordinates.lng': 'Longitude',
      'date.dateType': 'Date Type',
      'date.date': 'Event Date',
      'date.endDate': 'End Date',
      'date.recurranceDay': 'Recurrence Day',
      'type': 'Event Type',
      'startTime': 'Start Time',
      'endTime': 'End Time',
      'tickets': 'Tickets',
      'tickets.title': 'Ticket Title',
      'tickets.price': 'Ticket Price',
      'tickets.seats': 'Ticket Seats',
      'language': 'Languages'
    };
  
    // Try to find exact match first
    if (labelMap[controlPath]) {
      return labelMap[controlPath];
    }
  
    // Handle array indices (e.g., startTime[0])
    const arrayMatch = controlPath.match(/^(.+?)\[\d+\]$/);
    if (arrayMatch && labelMap[arrayMatch[1]]) {
      return labelMap[arrayMatch[1]];
    }
  
    // Handle nested paths (e.g., tickets[0].title)
    const nestedMatch = controlPath.match(/^(.+?)\.(.+)$/);
    if (nestedMatch) {
      const parent = nestedMatch[1].replace(/\[\d+\]/g, '');
      const child = nestedMatch[2];
      if (labelMap[`${parent}.${child}`]) {
        return labelMap[`${parent}.${child}`];
      }
      if (labelMap[child]) {
        return `${this.getFieldLabel(parent)} - ${labelMap[child]}`;
      }
    }
  
    // Default: return the control path with some formatting
    return controlPath
      .replace(/\./g, ' - ')
      .replace(/\[\d+\]/g, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
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
    
    // Add to local array with a temporary ID
    this.coupons.push({
      ...this.newCoupon,
      _id: 'temp_' + Date.now() // Temporary ID to track locally
    });
    
    // Reset the form
    this.newCoupon = {
      _id: '',
      code: '',
      value: 0,
      expiry: ''
    };
    
    this.toaster.showToast('success', 'Coupon added to form');
  }
  
  removeCoupon(couponId: string): void {
    // Remove from local array
    this.coupons = this.coupons.filter(c => c._id !== couponId);
    this.toaster.showToast('success', 'Coupon removed from form');
  }

  getTicketFormGroup(index: number): FormGroup {
    return this.ticketsArray.at(index) as FormGroup;
  }
  
  getTnCFormGroup(index: number): FormGroup {
    return this.tncArray.at(index) as FormGroup;
  }

  
}