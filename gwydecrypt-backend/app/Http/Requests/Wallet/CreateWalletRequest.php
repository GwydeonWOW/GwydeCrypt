<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateWalletRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'address' => [
                'required',
                'string',
                'min:10',
                'max:255',
                $this->getAddressValidationRule(),
            ],
            'chain' => [
                'required',
                'string',
                'in:eth,sol,polygon,sui,base,op,bnb,btc,arb,linea,commodities,fiat',
            ],
            'label' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'regex:/^[\w\s\-\.]+$/',
            ],
        ];
    }

    /**
     * Get address validation rule based on chain.
     */
    private function getAddressValidationRule(): string
    {
        $chain = $this->input('chain');

        return match ($chain) {
            'eth', 'polygon', 'base', 'op', 'bnb', 'arb', 'linea' => 'regex:/^0x[a-fA-F0-9]{40}$/',
            'sol' => 'regex:/^[1-9A-HJ-NP-Za-km-z]{32,44}$/',
            'sui' => 'regex:/^0x[a-fA-F0-9]{40,}$/',
            'btc' => 'regex:/^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{33,34}|bc1[a-z0-9]{39,59})$/',
            'commodities', 'fiat' => 'string',
            default => 'string',
        };
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'address.required' => 'The wallet address is required.',
            'address.regex' => 'The wallet address format is invalid for the selected chain.',
            'chain.required' => 'The blockchain network is required.',
            'chain.in' => 'The blockchain network must be one of: eth, sol, polygon, sui, base, op, bnb, btc, arb, linea, commodities, fiat.',
            'label.regex' => 'The label format is invalid.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'address' => trim($this->address),
            'chain' => strtolower(trim($this->chain)),
            'label' => $this->has('label') ? trim($this->label) : null,
        ]);
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
        return [
            'address' => strip_tags(trim($this->address)),
            'chain' => strtolower(trim($this->chain)),
            'label' => $this->has('label') ? strip_tags(trim($this->label)) : null,
        ];
    }
}
