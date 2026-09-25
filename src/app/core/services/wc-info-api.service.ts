import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Toilet,
  normalizeToiletList,
  AddToiletPayload,
  AddToiletResponse,
  UpdateToiletPayload,
  UpdateToiletResponse,
  SendToiletFeedbackRequest,
  SendToiletFeedbackResponse,
  ToiletPropertyItem,
  AddToiletPropertiesResponse,
  UploadPhotoResponse,
  DeletePhotoResponse
} from '../models/toilet.model';

@Injectable({
  providedIn: 'root'
})
export class WcInfoApiService {
  private readonly http = inject(HttpClient);

  get baseUrl(): string {
    return environment.apiBaseUrl.replace(/\/+$/, '');
  }

  fetchToiletsNearby(lat: number, lon: number, distance = 10, filter?: string): Observable<Toilet[]> {
    const clampedDistance = Math.min(Math.max(distance, 1), 10);
    let params = new HttpParams().set('distance', clampedDistance.toString());
    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<any[]>(`${this.baseUrl}/toilets/nearby/${lat}/${lon}`, { params }).pipe(
      map((items) => normalizeToiletList(items))
    );
  }

  fetchToiletById(id: number): Observable<Toilet> {
    return this.http.get<any>(`${this.baseUrl}/toilet/${id}`).pipe(
      map((item) => normalizeToiletList([item])[0])
    );
  }

  fetchToiletsInBounds(south: number, west: number, north: number, east: number, filter?: string): Observable<Toilet[]> {
    let params = new HttpParams();
    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<any[]>(`${this.baseUrl}/toilets/bounds/${south}/${west}/${north}/${east}`, { params }).pipe(
      map((items) => normalizeToiletList(items))
    );
  }

  addToilet(payload: AddToiletPayload): Observable<AddToiletResponse> {
    return this.http.post<AddToiletResponse>(`${this.baseUrl}/toilet/add`, payload);
  }

  updateToilet(id: number, payload: UpdateToiletPayload): Observable<UpdateToiletResponse> {
    return this.http.patch<UpdateToiletResponse>(`${this.baseUrl}/toilet/${id}/update`, payload);
  }

  sendToiletFeedback(toiletId: number, payload: SendToiletFeedbackRequest): Observable<SendToiletFeedbackResponse> {
    return this.http.post<SendToiletFeedbackResponse>(`${this.baseUrl}/toilet/feedback/${toiletId}`, payload);
  }

  addToiletProperties(toiletId: number, properties: ToiletPropertyItem[]): Observable<AddToiletPropertiesResponse> {
    return this.http.post<AddToiletPropertiesResponse>(`${this.baseUrl}/toilet/add-properties/${toiletId}`, properties);
  }

  uploadPhoto(file: File, toiletId?: number, exif?: string, fixedGeo?: { lat: number; lon: number }): Observable<UploadPhotoResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (toiletId !== undefined && toiletId !== null) {
      formData.append('toilet_id', toiletId.toString());
    }

    if (exif) {
      formData.append('exif', exif);
    }

    if (fixedGeo) {
      formData.append('fixed_geo', JSON.stringify(fixedGeo));
    }

    return this.http.post<UploadPhotoResponse>(`${this.baseUrl}/upload`, formData);
  }

  deletePhoto(toiletId: number, filename: string, soft?: number): Observable<DeletePhotoResponse> {
    let params = new HttpParams();
    if (soft !== undefined) {
      params = params.set('soft', soft.toString());
    }
    return this.http.delete<DeletePhotoResponse>(`${this.baseUrl}/deletePhoto/${toiletId}/${filename}`, { params });
  }

  healthCheck(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`);
  }
}
