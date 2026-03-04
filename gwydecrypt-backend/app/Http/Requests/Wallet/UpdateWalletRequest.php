<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateWalletRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to la request.
     */
    public function rules(): array
    {
        return [
            'label' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[\w\s\-\.]+$/',
            ],
            'address' => [
                'sometimes',
                'required',
                'string',
                'min:10',
                'max:255',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'label.required' => 'The label field is required.',
            'label.regex' => 'The label format is invalid.',
            'address.required' => 'The wallet address field is required.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('label')) {
            $this->merge([
                'label' => trim($this->label),
            ]);
        }

        if ($this->has('address')) {
            $this->merge([
                'address' => trim($this->address),
            ]);
        }
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }

    /**
     * Get sanitized data.
     */
    public function sanitizedData(): array
    {
        $data = [];

        if ($this->has('label')) {
            $data['label'] = strip_tags(trim($this->label));
        }

        if ($this->has('address')) {
            $data['address'] = strip_tags(trim($this->address));
        }

        return $data;
    }
}
